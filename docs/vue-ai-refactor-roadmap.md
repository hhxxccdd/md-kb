# MD-KB 全栈重构路线图

> 本文档是 MD-KB 的统一重构方案，覆盖 Vue 前端、NestJS 后端、协同编辑、情境感知 AI、RAG、测试与面试准备。

## 1. 最终目标

把当前“能运行的 Markdown 知识库”逐步重构成一个结构清晰、可解释、可测试的协作文档应用：

- 前端使用 Vue 3 + Composition API，页面、业务逻辑和数据访问边界清晰；
- 后端从 Express 迁移到 NestJS，按模块组织认证、文档、协同和 AI；
- Yjs/WebSocket 负责实时文档协同，HTTP 负责普通业务，SSE 负责 AI 流式输出；
- AI 采用情境感知提示，不主动修改文档，不盲目调用模型；
- RAG 只用于需要从文档中检索证据的问答场景；
- 文档保存版本、协同实时状态和 RAG 索引版本明确分离；
- 具备单元测试、接口测试和关键端到端流程测试。

这条路线符合现代 Vue 中型应用的基本实践，但不追求为了“看起来先进”而增加不必要的框架。架构质量的核心是职责、数据流、生命周期和可测试性。

参考：

- [Vue Composables](https://vuejs.org/guide/reusability/composables)
- [Vue State Management](https://vuejs.org/guide/scaling-up/state-management.html)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Yjs Collaborative Editor](https://docs.yjs.dev/getting-started/a-collaborative-editor)
- [TanStack Query for Vue](https://tanstack.com/query/v5/docs/framework/vue/overview)

---

## 2. 先记住四条原则

### 2.1 先稳定数据流，再增加功能

新建文档、路由切换、协同连接、保存和刷新必须可靠后，再做主动 AI 和 RAG。否则多个问题叠加时很难定位原因。

### 2.2 触发提示不等于调用模型

前端可以根据粘贴、选区、保存等事件显示建议，但真正的 LLM 请求必须由用户确认。AI 只能建议，用户接受后才能修改文档。

### 2.3 每类状态只有一个权威来源

不要让 Pinia、localStorage、组件 ref 和后端各自维护一份互相独立的登录或文档状态。每类数据必须明确谁负责读取、修改和持久化。

### 2.4 先做最小闭环，再扩大范围

先完成单文档、单用户、可引用的 RAG 问答，再考虑跨文档检索、Ghost text 和自动审稿。

---

## 3. 当前项目最值得重构的地方

### 3.1 `EditorPage.vue` 职责过多

当前编辑页同时处理文档加载、编辑器实例、标题、保存状态、Yjs、WebSocket、在线用户、AI 弹窗、导出和邀请链接。

建议拆成：

```text
EditorPage.vue
├── EditorHeader.vue
├── MyMdEditor.vue
├── AiHintPanel.vue
├── AiActionPanel.vue
├── useDocument.ts
├── useDocumentCollaboration.ts
├── useAITrigger.ts
├── useAIAction.ts
└── useMarkdownExport.ts
```

页面组件只负责组合能力和页面级展示，不承载所有业务规则。

### 3.2 新建文档后协同可能不会初始化

从 `/edit` 新建文档后，路由会变成 `/edit/:id`，但 Vue Router 可能复用同一个页面实例，因此 `onMounted` 不会重新执行。

需要监听路由参数：

```text
docId 变化
  ↓
清理旧文档的 WebSocket、Yjs、定时器和监听器
  ↓
加载服务端快照
  ↓
设置编辑器初始内容
  ↓
建立协同连接
  ↓
进入可编辑状态
```

### 3.3 编辑器组件业务过重

`MyMdEditor.vue` 不应同时负责标题解析、创建文档、自动保存、图片上传和协同判断。

建议保持三层边界：

```text
documentService.ts       纯接口调用，不依赖 Vue
useDocument.ts            ref、watch、保存状态和生命周期
MyMdEditor.vue            编辑器 UI、内容变化和编辑器能力暴露
```

### 3.4 认证状态来源不统一

当前路由守卫、请求拦截器和 Pinia store 都会读取或清理 localStorage。刷新 token 后，Pinia 内存状态可能与本地存储不一致。

建议提供统一的：

```text
restoreSession()
setSession()
clearSession()
```

路由守卫只读取 store 或统一认证服务，不直接在多处重复实现清理逻辑。

### 3.5 搜索、计时器和事件需要清理

管理页搜索要处理防抖、请求竞态和卸载清理；登录页验证码计时器要在卸载时清除；编辑器事件监听和 WebSocket 也必须有对应的销毁逻辑。

### 3.6 AI 问答不应信任前端整篇文档

当前前端把 `docContent` 发送给 AI。长文档会造成 token、速度和准确性问题，也无法保证前端传入内容与用户实际有权限读取的文档一致。

后续问答接口应只接收：

```json
{
  "docId": 123,
  "question": "这个项目如何处理登录过期？"
}
```

服务端负责鉴权、读取文档版本、检索片段和调用模型。

---

## 4. 目标目录结构

### 4.1 前端：按业务模块组织

全局按 `components/`、`composables/`、`api/` 分类在功能较少时可用；随着文档、编辑器、协同和 AI 增加，建议改为 feature-first：

```text
frontend/src/
├── features/
│   ├── document/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── document.api.ts
│   │   ├── document.types.ts
│   │   └── document.store.ts
│   ├── editor/
│   │   ├── components/
│   │   ├── composables/
│   │   └── editor.types.ts
│   ├── collaboration/
│   │   ├── collaboration.socket.ts
│   │   ├── useDocumentCollaboration.ts
│   │   └── collaboration.types.ts
│   └── ai/
│       ├── components/
│       ├── composables/
│       ├── ai.api.ts
│       ├── ai.stream.ts
│       └── ai.types.ts
├── shared/
│   ├── components/
│   ├── composables/
│   ├── request/
│   ├── auth/
│   └── types/
├── router/
└── stores/
```

`shared/` 只放真正通用的能力；文档专用组件不要放进全局公共目录。

### 4.2 后端：NestJS 模块化

NestJS 后端建议组织为：

```text
backend/src/
├── app.module.ts
├── common/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── decorators/
├── config/
├── database/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── access-token.guard.ts
│   │   └── dto/
│   ├── users/
│   ├── documents/
│   ├── collaboration/
│   │   ├── collaboration.gateway.ts
│   │   ├── collaboration.service.ts
│   │   ├── ydoc.service.ts
│   │   └── persistence.service.ts
│   └── ai/
│       ├── ai.controller.ts
│       ├── ai.service.ts
│       ├── ai-stream.service.ts
│       ├── rag.service.ts
│       ├── prompt/
│       └── dto/
└── main.ts
```

模块内部的 controller 负责 HTTP/WebSocket 入口，service 负责业务，repository 或 Prisma service 负责数据访问，DTO 负责输入校验。

---

## 5. 前端重构路线

### 5.1 阶段 0：修复文档与协同生命周期

学习重点：

- `ref`、`computed`、`watch`；
- 路由参数变化和组件复用；
- `onMounted` / `onBeforeUnmount`；
- WebSocket 和 Yjs 资源管理；
- 父子组件事件与 `defineExpose`。

任务：

- [ ] 监听 `route.params.id`；
- [ ] 切换文档时销毁旧连接和 Yjs；
- [ ] 明确编辑器初始内容的唯一来源；
- [ ] 新建文档后重新进入协同状态；
- [ ] 统一保存中、已保存、保存失败状态；
- [ ] 清理所有计时器、DOM 事件和请求。

验收：新建、打开、切换、刷新、协同编辑和离开页面都不会停止保存或残留连接。

### 5.2 阶段 1：拆分组件与 composable

学习重点：

- composable 的职责边界；
- props / emits；
- `Teleport`；
- 可复用的纯函数；
- API service 与 Vue 逻辑分离。

任务：

- [ ] 拆出 `EditorHeader.vue`；
- [ ] 将保存逻辑移入 `useDocument`；
- [ ] 将协同逻辑移入 `useDocumentCollaboration`；
- [ ] 将导出逻辑移入 `useMarkdownExport`；
- [ ] 将管理页搜索移入 `useDocumentSearch`；
- [ ] 让 `MyMdEditor.vue` 只负责编辑器本身。

不要让 composable 变成新的“上帝文件”。如果函数不依赖 Vue，就优先写成普通 TypeScript 模块。

### 5.3 阶段 2：状态管理分层

Pinia 管理客户端状态：

- 登录用户；
- AI 设置；
- 当前 UI 状态；
- 协同连接状态。

文档列表、文档详情、搜索结果、摘要和索引状态属于服务端状态，需要缓存、失效和重新请求。当前阶段可以手写请求状态；当重复请求和缓存变复杂时，再引入 TanStack Query for Vue。

```text
Pinia              客户端状态
TanStack Query     服务端状态（可选）
Composable         页面级逻辑组合
```

### 5.4 阶段 3：无模型的情境感知提示

先不调用模型，实现本地检测：

- 粘贴大段文本后的建议；
- 选中文本后的操作条；
- Markdown 结构健康检查；
- 保存完成后的低频提示。

结构建议：

```text
aiTriggerRules.ts       纯函数，判断是否应该提示
useAITrigger.ts         编辑器事件、定时器、冷却和生命周期
AiHintPanel.vue          显示提示、忽略、确认
```

`useAITrigger` 只产生 `AIHint`，不能直接请求模型。

```ts
type AIHintType = 'paste' | 'selection' | 'save-check' | 'idle'

interface AIHint {
  id: string
  type: AIHintType
  message: string
  actions: Array<'polish' | 'translate' | 'explain' | 'review'>
  context?: string
  position?: { top: number; left: number }
}
```

### 5.5 阶段 4：重构 AI 调用层

拆分：

```text
useAIAction.ts          加载、取消、错误、接受结果
ai.stream.ts            SSE 读取与事件解析
ai.api.ts               普通 HTTP API
AiActionPanel.vue       流式结果与接受/忽略
```

要求：

- 使用 `AbortController` 支持取消；
- 明确 loading、done、error 三种状态；
- 处理网络中断和重复提交；
- 用户接受后才调用编辑器替换；
- 不在组件中直接拼接所有网络请求细节。

AI 功能的推荐范围：

| 功能 | 触发 | 是否使用 RAG |
|---|---|---|
| 润色 | 用户确认选中文本或粘贴提示 | 否 |
| 翻译 | 用户确认选中文本或粘贴提示 | 否 |
| 结构检查 | 保存或手动检查 | 否，优先本地规则 |
| 摘要 | 稳定保存后异步生成 | 否 |
| 版本变更说明 | 用户打开版本对比 | 否 |
| 文档问答 | 用户提问 | 是 |
| 跨文档问答 | 用户提问 | 是 |
| Ghost text | 光标停留后用户接受 | 通常否 |

---

## 6. NestJS 后端迁移方案

### 6.1 迁移原则

NestJS 迁移的第一步不是改业务，而是保持接口行为不变：

- HTTP 路径不变；
- 请求参数不变；
- 响应结构不变；
- 错误码不变；
- WebSocket 地址和消息格式尽量不变；
- 前端可以在后端迁移期间继续工作。

不要同时进行 Express → NestJS、数据库重构、协同协议重构和 AI 业务重写。一次只改变一层。

### 6.2 Express 到 NestJS 的映射

```text
Express Router       → Nest Controller
Express middleware   → Guard / Interceptor / Middleware
业务 service         → Injectable Service
error middleware     → Exception Filter
请求参数检查         → DTO + ValidationPipe
WebSocket server     → WebSocket Gateway
Prisma 工具          → PrismaModule + PrismaService
```

推荐启用全局：

- `ValidationPipe`：校验 DTO 和转换参数；
- 全局异常过滤器：统一错误响应；
- 认证 Guard：处理 access token；
- 日志或请求拦截器：记录请求耗时和 request id；
- ConfigModule：统一读取环境变量。

### 6.3 迁移顺序

#### 第一步：建立基线

- [ ] 记录现有 API、错误码和 WebSocket 消息；
- [ ] 为登录、文档 CRUD、AI SSE 写最小 smoke test；
- [ ] 固定 Prisma schema 和现有数据库；
- [ ] 明确哪些行为必须保持兼容。

#### 第二步：基础设施

- [ ] 创建 NestJS 项目；
- [ ] 配置 `ConfigModule`；
- [ ] 创建 `PrismaModule` 和 `PrismaService`；
- [ ] 迁移统一响应、异常和日志处理；
- [ ] 增加 DTO、ValidationPipe 和基础 Guard。

#### 第三步：迁移认证和用户

- [ ] `AuthModule`；
- [ ] 登录、注册、验证码登录；
- [ ] access token / refresh token；
- [ ] 登录过期和刷新并发控制；
- [ ] 用户资料和权限检查。

#### 第四步：迁移文档模块

- [ ] 文档创建、查询、更新和删除；
- [ ] 私有文档、共享文档和邀请；
- [ ] 图片上传；
- [ ] 文档权限 service；
- [ ] 文档版本和保存状态。

#### 第五步：迁移协同模块

协同模块最复杂，建议最后迁移：

- [ ] WebSocket Gateway；
- [ ] token 鉴权；
- [ ] room 管理；
- [ ] Yjs update / sync；
- [ ] presence / awareness；
- [ ] 持久化和重连；
- [ ] 关闭房间时的资源清理。

保持现有消息类型，例如 `connected`、`presence`、`y-update`、`y-sync`、`saved`，等迁移稳定后再考虑协议升级。

#### 第六步：迁移 AI 模块

- [ ] AI Controller；
- [ ] AI Service；
- [ ] SSE 流式 service；
- [ ] 限流 Guard 或 middleware；
- [ ] Prompt 模板；
- [ ] 会话和消息持久化；
- [ ] AI 请求取消与模型异常处理。

完成 Nest 迁移后，再修改 AI 的主动触发和 RAG 逻辑。

### 6.4 NestJS 迁移验收

- [ ] 前端不修改接口即可完成登录；
- [ ] 文档创建、编辑、保存和邀请功能正常；
- [ ] 两个浏览器窗口可以协同编辑；
- [ ] 重连后文档内容不丢失；
- [ ] AI SSE 可以流式输出并处理异常；
- [ ] 错误响应结构和旧版本兼容；
- [ ] 关键接口有测试覆盖。

---

## 7. RAG 设计

### 7.1 RAG 是否必要

RAG 对本项目不是必需功能，但适合做成一个有辨识度的 AI 工程亮点。对于前端实习，Vue、TypeScript、浏览器、网络、工程化和性能仍然是基础；RAG 不能替代这些能力。

建议把项目能力分成：

```text
Vue 前端与协同编辑       主要能力
情境感知 AI              产品体验亮点
单文档 RAG               AI 工程亮点
```

如果时间有限，完成 Vue 阶段 0–4 和 NestJS 迁移比仓促做一个复杂 RAG 更有价值。

### 7.2 适合 RAG 的功能

RAG 用于：

- 单篇长文档问答；
- 多篇有权限文档问答；
- 回答显示标题、行号或片段来源；
- 需要从资料中找证据的解释。

RAG 不用于：

- 润色；
- 翻译；
- Markdown 结构检查；
- 简单版本差异说明；
- 短文本续写。

### 7.3 推荐的最小单文档 RAG

前端只发送：

```json
{
  "docId": 123,
  "question": "这个项目如何处理登录过期？"
}
```

后端流程：

```text
校验用户和文档权限
  ↓
读取已保存的文档版本
  ↓
按 Markdown 标题切分
  ↓
检索相关片段
  ↓
组合问题、片段和有限历史
  ↓
调用模型
  ↓
返回答案、引用和索引版本
```

### 7.4 分块与索引

建议：

- 按 Markdown 标题结构分块；
- 每块约 300–600 token；
- 保留少量相邻上下文；
- 保存 `heading`、`startLine`、`endLine`、`documentId`、`version`；
- 文档稳定保存后异步索引；
- 只为最新稳定版本提供检索。

概念数据结构：

```text
DocumentChunk
├── documentId
├── version
├── heading
├── content
├── embedding
├── startLine
├── endLine
└── createdAt
```

检索必须先按权限过滤，再计算相似度，不能先全库检索再判断权限。

### 7.5 存储选择

当前 MySQL 项目可分阶段实现：

- 学习和小数据量：embedding 暂存 JSON，在 Node.js 中计算余弦相似度；
- 数据增长后：使用 Qdrant 等向量数据库，或 PostgreSQL + pgvector；
- 不建议一开始为了 RAG 整体迁移数据库。

### 7.6 回答质量

Prompt 和接口要约束模型：

- 只能根据检索片段回答；
- 证据不足时明确说明未找到依据；
- 返回引用的分块 ID；
- 前端展示标题、行号或原文片段；
- 记录检索版本，避免回答来源不明。

---

## 8. 三种文档状态必须分开

这是整个系统最重要的数据设计之一：

```text
Yjs 实时状态
    ↓ 稳定保存
Document 持久化快照
    ↓ 异步索引
RAG 向量索引
```

建议记录：

```text
documentVersion       当前服务端文档版本
savedVersion           编辑器最近已确认保存的版本
indexedVersion         RAG 最近完成索引的版本
indexStatus            idle | pending | ready | failed
```

这能处理“编辑器已经是新内容，但 AI 仍使用旧索引”的问题。索引任务失败时，不能静默地假装使用的是最新内容。

---

## 9. 测试与工程化

### 9.1 前端测试

- `detectMarkdownIssues()` 规则单元测试；
- `useAITrigger()` 的触发、冷却、忽略和取消测试；
- `useDocument()` 的加载、保存失败和路由切换测试；
- 协同连接建立、关闭和重连测试；
- AI SSE 解析、取消和异常测试。

### 9.2 后端测试

- Auth Guard 和 refresh token 测试；
- 文档权限测试；
- 文档版本保存测试；
- WebSocket 消息协议测试；
- AI 请求限流和鉴权测试；
- RAG 权限过滤和索引版本一致性测试。

### 9.3 端到端流程

至少完成一个 Playwright 流程：

```text
登录
  ↓
新建文档
  ↓
编辑并保存
  ↓
刷新页面
  ↓
另一个窗口加入协同
  ↓
发起文档问答
  ↓
查看回答引用
```

### 9.4 工程化基础

- [ ] ESLint；
- [ ] Prettier；
- [ ] TypeScript 类型检查；
- [ ] 环境变量校验；
- [ ] API 错误码和 DTO；
- [ ] Git 小步提交；
- [ ] README 架构图与运行说明；
- [ ] 关键模块的测试命令。

---

## 10. 推荐实施顺序与时间

以下按照每天 1–2 小时、边学边做估算。时间不是硬性期限，真正的目标是每阶段都有可验证结果。

### 阶段 A：Vue 基础重构，1–2 周

- 路由参数和组件生命周期；
- 新建文档后的协同初始化；
- 编辑器、保存、协同拆分；
- 认证状态统一；
- 管理页搜索和计时器清理。

### 阶段 B：AI 前端重构，1–2 周

- `useAITrigger`；
- 本地结构检查；
- 粘贴提示和选区操作条；
- `useAIAction`；
- SSE 取消、错误和接受结果。

### 阶段 C：NestJS 迁移，4–8 周

- 基础设施和 Prisma；
- Auth / User；
- Document；
- Collaboration；
- AI / SSE；
- 前端联调、测试和部署。

如果全职投入，单独迁移 NestJS 大约需要 2–4 周；如果每天只有 1–2 小时，通常需要 4–8 周。协同 WebSocket 是最容易超时的部分。

### 阶段 D：单文档 RAG，1–2 周

- 文档分块；
- embedding 存储；
- 权限过滤；
- Top-K 检索；
- 引用展示；
- 索引版本和失败状态。

### 阶段 E：测试与面试整理，1–2 周

- 单元测试和端到端测试；
- 项目 README；
- 架构图；
- 性能和错误处理说明；
- 项目演示与面试问答。

### 总体时间

```text
只做 NestJS 迁移：        4–8 周（业余学习）
Vue + NestJS 重构：        6–10 周（业余学习）
Vue + NestJS + AI + RAG：  2–3 个月（业余学习）
```

不建议把所有阶段同时进行。一次只推进一个主目标，完成验收后再进入下一阶段。

---

## 11. 对前端实习的价值

这个项目可以作为前端实习项目，但亮点不应只写“使用了 AI 和 RAG”。更有说服力的描述是：

> 基于 Vue 3 和 NestJS 实现协作文档系统，使用 Yjs/WebSocket 完成实时编辑，使用 SSE 实现 AI 流式交互；通过按 Markdown 标题分块、服务端权限过滤和版本化索引实现单文档 RAG 问答，并在回答中展示原文引用。

面试官可能追问：

- 为什么新建文档后需要监听 route id？
- Yjs 和普通 WebSocket 消息分别解决什么问题？
- 为什么 AI 提示不应该通过协同通道广播？
- access token 刷新并发时如何避免重复刷新？
- RAG 为什么不能直接把全文放进 Prompt？
- 文档更新后如何保证问答不使用旧索引？
- NestJS Gateway、Guard、Filter 分别负责什么？
- 如果模型服务中断，前端如何取消并恢复状态？

只有当你能独立解释并修改这些部分时，项目才真正属于你的能力，而不是代码堆积。

---

## 12. 学习方法

不要先把 Vue、NestJS、RAG 全部学完再开始，也不要完全盲写。采用“问题驱动学习”：

```text
选一个具体重构目标
  ↓
只学习完成它所需的知识
  ↓
写一个最小 Demo
  ↓
回到项目实现
  ↓
测试、重构并记录原因
```

推荐使用四类提问来辅助学习：

- “不要直接改代码，先解释这个 bug 的生命周期原因。”
- “给我三个实现思路，我自己选择。”
- “帮我 review 这次改动，重点检查状态归属和资源清理。”
- “为这个 composable / service 设计测试用例。”

每完成一个模块，都回答：

1. 为什么要这样拆？
2. 状态应该放在哪里？
3. 谁负责创建和销毁？
4. 网络失败时状态如何恢复？
5. 能否脱离 UI 单独测试？

---

## 13. 最终检查清单

### Vue

- [ ] 能解释 `ref`、`computed`、`watch` 的适用场景；
- [ ] 能处理路由复用和生命周期清理；
- [ ] 能独立写 composable；
- [ ] 能拆分组件而不制造新的巨型 composable；
- [ ] 能处理 loading、error、empty 和取消状态。

### NestJS

- [ ] 能解释 Module、Controller、Service、Guard、Pipe、Filter、Interceptor；
- [ ] 能实现 DTO 校验和统一错误处理；
- [ ] 能写 WebSocket Gateway；
- [ ] 能保持 API 兼容并逐步迁移；
- [ ] 能测试权限和认证边界。

### AI / RAG

- [ ] AI 只有在用户确认后调用；
- [ ] SSE 支持取消和异常；
- [ ] RAG 请求不信任前端整篇文档；
- [ ] 检索前先做权限过滤；
- [ ] 索引与文档版本一致；
- [ ] 回答展示引用，证据不足时不编造。

### 工程能力

- [ ] 有测试；
- [ ] 有 README 和架构图；
- [ ] 能用 3 分钟讲清项目；
- [ ] 能指出当前项目的缺陷；
- [ ] 能现场修改其中一个模块。

## 14. 结论

这不是一次必须一次完成的大重写，而是一条分阶段的学习路线：先修 Vue 和协同基础，再迁移 NestJS，然后重构 AI，最后实现最小 RAG。

完成全部内容大约需要 2–3 个月的业余时间。即使最后没有完成高级 AI 功能，只要 Vue 架构、NestJS 模块、协同生命周期、错误处理和测试做扎实，这个项目也已经具备较好的前端实习项目价值。

