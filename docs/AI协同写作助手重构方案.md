# MD-KB：协同写作 AI 助手重构方案

> 文档定位：本方案不是给 Markdown 编辑器叠加几个大模型按钮，而是将 AI 设计为一个**以用户控制、协同边界和可靠性为核心的情境感知写作助手**。
>
> 适用范围：当前 MD-KB 项目。本文明确不在本阶段引入 RAG、多智能体或自动续写。

---

## 1. 为什么要重构 AI，而不是继续增加功能

当前项目已经有 AI 润色、翻译、文档问答与 SSE 流式输出能力。但如果只停留在“选中文本 → 点击按钮 → 调用模型”，本质仍是一个 API 包装层：功能能用，却没有体现编辑器、协同系统和 AI 之间的设计思考。

更有价值的问题是：

1. AI 何时应该出现，何时不应该打扰用户？
2. AI 生成的内容能否直接改写多人协作文档？
3. 文档上下文由谁提供，如何避免前端把整篇文档和无权限内容发送给模型？
4. SSE 断开、用户关闭弹窗、重复点击时，生成任务如何取消、重试和收尾？
5. 哪些检查应使用确定性代码，哪些问题才值得花模型成本？

本次改造的目标，是回答这些问题，并把答案落实为可维护的前后端边界。

### 1.1 产品定位

项目对外可描述为：

> 一个面向多人 Markdown 协作的、以用户确认和上下文边界为核心的 AI 写作助手。

不建议将它包装成“多智能体 Agent”。Agent 通常具备目标拆解、工具调用、循环决策和一定的自主执行能力；本项目更准确的定位是 **human-in-the-loop（人参与决策）AI copilot**。准确定位比堆砌热点概念更有说服力。

### 1.2 核心差异

```text
编辑行为（粘贴 / 选中 / 保存完成）
          ↓
本地规则识别与触发策略
          ↓
只显示建议，不自动调用模型
          ↓
用户主动选择 AI 操作
          ↓
可取消的 SSE 流式生成
          ↓
个人预览与差异确认
          ↓
用户明确采纳后写入编辑器
          ↓
Yjs 同步真实文档内容给协作者
```

这里有一条必须坚持的边界：

- AI 提示、加载状态、草稿结果：**仅属于当前用户的本地 UI 状态**，不进入 Yjs、不通过协同 WebSocket 广播。
- 用户点击“采纳”后写入编辑器的文字：才是文档真实内容，由现有 CodeMirror/Yjs 协同链路同步。

这样可以避免 A 的个人提示突然出现在 B 的屏幕上，也避免模型输出在未经确认时污染协作文档。

---

## 2. 功能取舍与优先级

### 2.1 本阶段必须完成（P0）

| 功能 | 用户价值 | 工程价值 | 为什么值得做 |
|---|---|---|---|
| 选区 AI 操作条 | 高 | 高 | 在用户已有明确意图时提供润色、翻译、解释，不再依赖页面顶部的泛化入口 |
| 大段粘贴后的本地建议 | 高 | 高 | 体现“情境感知”，但只提示、不自动消耗模型额度 |
| 保存后的 Markdown 质量检查 | 高 | 很高 | 用确定性规则解决确定性问题，成本为零，能展示工程判断力 |
| 统一 AI 流式动作层 | 中 | 很高 | 统一加载、错误、取消、重试、结果确认，消除组件内请求逻辑混乱 |
| 最小 AI 偏好设置 | 中 | 中 | 用户可以关闭提示，避免“主动”变成“打扰” |

### 2.2 有时间再做（P1）

| 功能 | 取舍 |
|---|---|
| 基于当前文档的问答 | 保留，但改为后端根据 `documentId` 鉴权和选择上下文；前端不再提交整篇正文 |
| 手动生成文档摘要 + 版本缓存 | 有产品感，但需版本策略、缓存失效与数据库字段，放在核心流程稳定后 |
| 规则型风格提醒 | 可先做重复词、过长句等少量高置信规则；不要过早做“被动语态/书面语”这类误报高的启发式 |

### 2.3 明确暂缓（及原因）

| 功能 | 暂缓原因 |
|---|---|
| RAG | 当前单篇文档规模小；会额外引入切片、向量索引、召回、索引更新、权限过滤与评估，收益不匹配复杂度 |
| 幽灵续写（ghost text） | 易打扰用户，和 Copilot 类似、差异弱；还会和 CodeMirror/Yjs 的光标、撤销栈及远端更新产生复杂交互 |
| 自动生成摘要 | 用户未表达需求就产生模型成本，缓存与“内容是否已过期”规则也不简单 |
| 经 WebSocket 广播 AI 提示 | AI 提示属于个人交互，不是共享文档状态；广播会产生噪音、权限和隐私问题 |
| 多 Agent | 当前没有真正需要自主工具编排的复杂任务，强行引入只会增加不必要的状态与评估负担 |

---

## 3. 总体架构与模块边界

建议采用 feature-first 的 AI 模块，而不是继续把逻辑堆在 `EditorPage.vue` 或 `AiModel.vue`。

```text
frontend/src/features/ai/
├── api/
│   └── aiApi.ts                 # 请求协议、SSE 连接入口；不包含 UI 状态
├── composables/
│   ├── useAIAction.ts           # 流式动作、取消、重试、错误状态
│   ├── useAITrigger.ts          # 粘贴/选区/保存事件的触发策略
│   └── useMarkdownQualityCheck.ts # 纯本地 Markdown 检查
├── components/
│   ├── AiActionPanel.vue        # 结果预览、采纳/放弃
│   ├── AiInlineHint.vue         # 行内提示，仅负责展示与 emit
│   └── MarkdownIssuePanel.vue   # 质量检查结果面板
├── types/
│   └── ai.ts                    # AIAction、AIHint、AIError 等类型
└── utils/
    ├── triggerPolicy.ts         # 阈值、冷却、内容指纹等纯函数
    └── markdownChecker.ts       # 无 Vue 依赖的纯检测函数
```

### 3.1 各层职责

| 层 | 应负责 | 不应负责 |
|---|---|---|
| `EditorPage` | 组合 composable、保存页面级状态、接收“采纳结果”并写回编辑器 | 直接解析 SSE、直接写正则规则、维护多个 AI 定时器 |
| `useAITrigger` | 监听编辑器事件、判断阈值和冷却时间、产出 `AIHint` | 调用大模型、直接修改文档 |
| `useAIAction` | 发起/取消 SSE、管理流式结果、标准化错误、暴露重试 | 计算浮层坐标、决定某个提示是否展示 |
| 展示组件 | 接收 props、展示 loading/结果、emit 用户行为 | 读 token、请求接口、修改 Yjs |
| 后端 AI 模块 | 鉴权、上下文选择、限流、调用模型、流式转发、审计 | 信任客户端传来的整篇文档或用户身份 |

### 3.2 推荐的核心类型

```ts
export type AIActionType = 'polish' | 'translate' | 'explain' | 'ask-document'

export type AIActionStatus =
  | 'idle'
  | 'streaming'
  | 'completed'
  | 'cancelled'
  | 'failed'

export interface AIHint {
  id: string
  source: 'selection' | 'paste' | 'save-check'
  message: string
  context: string
  actions: AIActionType[]
  position?: { top: number; left: number }
}

export interface AIActionRequest {
  requestId: string
  action: AIActionType
  documentId: string
  selectedText?: string
  question?: string
}

export interface AIStreamError {
  kind: 'cancelled' | 'network' | 'timeout' | 'unauthorized' | 'rate-limit' | 'server' | 'parse'
  message: string
  retryable: boolean
}
```

将状态建模为联合类型，而不是多个相互矛盾的布尔值，例如 `isLoading + isError + isCancelled`。这样 UI 和重试逻辑更容易穷尽判断。

---

## 4. 三个高价值交互的具体设计

### 4.1 选中文本操作条：明确意图优先

触发条件建议：

1. CodeMirror 当前选区文本长度至少 20 个字符；
2. 选区保持约 500ms；
3. 没有正在进行的 AI 请求；
4. 当前用户没有关闭该类提示。

展示操作：`润色`、`翻译`、`解释`。不需要“选中后停留 2 秒才猜测用户意图”——选中较长文本本身已是足够强的信号，500ms 主要用于避免拖拽选区时闪烁。

点击操作后：

```text
冻结本次选区文本快照
→ 打开结果面板
→ SSE 逐字写入“候选结果”
→ 用户查看原文与候选结果
→ [采纳替换] 或 [复制] 或 [放弃]
```

必须冻结文本快照。生成期间用户可以继续编辑，不能在请求结束时按“当前选区”替换，否则会误替换别的内容。更稳妥的第一版做法是让用户点击“采纳”时再次确认选区仍与原快照一致；不一致则只允许复制结果或重新生成。

### 4.2 粘贴建议：先本地判断，再让用户决定

监听编辑器 DOM 的 `paste` 事件，读取 `clipboardData.getData('text/plain')`。只在长度达到阈值（建议 120 字符）时分析：

- 英文字母比例高：提示“检测到英文内容，是否翻译成中文？”
- 中文比例高：提示“是否先润色这段内容？”
- 混合文本、代码块或链接列表：不主动提示，避免误报。

提示只是一张本地卡片，**不会自动调用模型**。对同一段文本计算轻量内容指纹，并记录“已忽略”；相同内容再次粘贴或短时间内重复操作时不再提示。

### 4.3 保存后的 Markdown 质量检查：不用 AI 的 AI 体验

在“HTTP 保存成功”或“协同保存确认”后检查最新文档内容。检测函数应是纯函数，输入内容，输出问题数组：

```ts
interface MarkdownIssue {
  rule: 'heading-level' | 'empty-heading' | 'image-alt' | 'empty-link' | 'unclosed-fence'
  severity: 'error' | 'warning' | 'info'
  line: number
  message: string
}
```

首批规则：标题层级跳跃、空标题、空图片 alt、空链接 URL、未闭合代码块。

这是项目的一个重点面试亮点：

> 对可精确判断的问题使用确定性规则，而不是调用 LLM。这样结果稳定、可解释、零 token 成本，也不会把用户内容无必要地发送到服务端。

问题面板只提供“跳到该行”“忽略本条”，不要自动修改文档。自动修复应当等用户明确选择后再引入。

---

## 5. 文档问答的安全重构：不做 RAG，也不上传整篇文档

旧实现若由前端发送 `documentContext`，会有三个问题：

1. 前端可能发送过期内容，和服务端持久化版本不一致；
2. 客户端不应决定自己能向模型提供哪些文档内容；
3. 整篇文档会增加 token 成本，也会稀释问题相关内容。

重构后的协议应为：

```text
前端：POST /api/ai/document-qa
      { documentId, question }
                    ↓
后端：从登录态得到 userId
      → 校验用户是否有该文档的查看权限
      → 从文档数据源读取内容
      → 依据标题、关键词和长度挑选少量相关段落
      → 调用模型，并在结果中标注参考章节
```

这不是 RAG，而是**受权限约束的轻量上下文选择**。对于当前项目规模，它比向量数据库更合适。后端也应限制单次上下文大小、问题长度和输出 token，避免成本失控。

---

## 6. 为什么选 SSE，而不是 WebSocket 或普通 HTTP

### 6.1 本项目的传输选择

| 方案 | 适合什么 | 本项目结论 |
|---|---|---|
| 普通 HTTP | 一次性、小结果、无需过程反馈 | 不适合长文本生成，用户会长时间只看到 loading |
| SSE | 服务端持续向客户端推送 token，客户端无需反向实时消息 | **AI 文本生成首选** |
| WebSocket | 双向高频消息、实时协同、在线状态 | 继续用于 Yjs/Presence，不承担 AI token 流 |

SSE 适合这里的原因：AI 生成天然是“后端持续输出、前端持续展示”的单向流；实现、调试和网络基础设施的复杂度通常低于重新设计一套 WebSocket AI 协议。协同编辑已经使用 WebSocket，不代表所有实时需求都要复用它。

### 6.2 `EventSource` 还是 `fetch + ReadableStream`

浏览器原生 `EventSource` 很适合 GET 型 SSE，但它不能方便地携带复杂 POST 请求体，也不方便用 `AbortController` 取消当前生成。AI 请求通常需要传递操作类型、选中文本、问题等数据，因此本项目建议：

```text
fetch(POST) + Accept: text/event-stream + response.body.getReader()
```

优点：

- 可以发送 JSON 请求体；
- 可以携带现有认证头；
- 可以用 `AbortController` 取消；
- 可以把流式协议统一封装到 `useAIAction`。

### 6.3 建议的 SSE 事件协议

不要只把任意字符串直接写回前端。建议建立可扩展的事件类型：

```text
event: meta
data: {"requestId":"...","model":"..."}

event: token
data: {"text":"第一段"}

event: done
data: {"usage":{"inputTokens":123,"outputTokens":45}}

event: error
data: {"code":"RATE_LIMIT","message":"请求过于频繁"}
```

前端解析器必须处理 SSE 的分帧：网络分块不等于一个完整事件，因此不能假设每一次 `reader.read()` 都是完整 JSON。应缓存不完整的行，直到得到空行分隔的完整事件后再解析。

后端响应至少设置：

```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

`X-Accel-Buffering: no` 用于避免常见反向代理缓冲整个响应后才一次性返回；部署到 Nginx 时也需要关闭对应 location 的 proxy buffering。

---

## 7. SSE 断联、取消和重试：可靠性设计

“能流式显示”不等于可靠。下面的策略是本次 AI 重构必须具备的。

### 7.1 前端状态机

```text
idle
 └─ 用户发起 → streaming
streaming
 ├─ 收到 done → completed
 ├─ 用户关闭 / 新请求 / 页面卸载 → cancelled
 ├─ 首 token 超时 / 网络中断 → failed(network|timeout)
 ├─ 401 → failed(unauthorized)
 └─ 429 → failed(rate-limit)
completed / cancelled / failed
 └─ 用户重试或新操作 → streaming
```

`useAIAction` 内部每次执行都创建一个新的 `AbortController`，并保存本次 `requestId`：

```ts
let controller: AbortController | undefined

function cancel() {
  controller?.abort()
  controller = undefined
}

onScopeDispose(cancel)
```

取消时要区分 `AbortError` 与真实网络失败：取消是用户行为，不应弹出“生成失败”。

### 7.2 什么时候取消请求

以下情况应调用 `abort()`：

- 用户关闭 AI 结果面板；
- 用户点击停止生成；
- 用户在上一个结果未完成时发起新请求；
- 路由切换、组件卸载；
- 当前文档 ID 变化。

这既节省模型成本，也防止旧请求晚到后覆盖新面板状态。每个流式回调还应判断 `requestId` 是否仍是当前请求，不是则丢弃。

### 7.3 断联后的正确兜底

生成式请求通常不可安全地“从断点续传”：模型端未必保存可恢复的生成游标，自动重新请求还可能得到不同结果或重复消耗额度。因此第一版应采用下面的保守策略：

| 情况 | 前端行为 | 是否自动重试 |
|---|---|---|
| 用户主动取消 | 保留已生成文本供复制，状态标记为已停止 | 否 |
| 未收到任何 token 就网络失败 | 显示“网络异常，重试” | 可在用户确认后重试 |
| 已收到部分 token 后断联 | 保留部分结果，显示“生成中断，可继续重试或复制已有内容” | 不自动重试 |
| 429 限流 | 展示服务端冷却信息 | 否 |
| 401 未登录/令牌过期 | 走统一认证刷新或提示重新登录 | 认证恢复后由用户重试 |
| 5xx/模型供应商错误 | 显示可重试错误 | 最多一次、且仅在尚未收到 token 时自动重试 |

自动重试的条件必须严格：**只在尚未输出 token 时、错误可重试时、最多一次**。否则用户会看到重复段落，也会难以理解费用为何增加。

### 7.4 超时与心跳

不要只设置一个很长的总请求超时。应分别处理：

- 首 token 超时：例如 15 秒仍没有任何内容，终止并提示服务响应慢；
- 空闲超时：已经开始生成后，连续例如 30 秒没有 token 或心跳，认为连接可能卡住；
- 总时长上限：例如 120 秒，防止异常连接长期占用。

后端在模型思考较久时可发送 SSE 注释心跳（如 `: ping\n\n`）或 `event: ping`。前端收到心跳只更新时间，不把它渲染为文本。

### 7.5 后端必须感知客户端断开

浏览器取消请求后，后端不能继续无意义地等待模型输出。后端需要监听客户端连接关闭事件，并中止到模型供应商的上游请求：

```text
客户端 AbortController.abort()
→ HTTP 连接关闭
→ 后端检测 req close
→ 后端 AbortController.abort()
→ 停止读取/请求模型供应商
→ 释放定时器、流和日志上下文
```

这是完整的资源清理链路。只在前端 `abort()` 而服务端继续生成，会造成隐形成本泄漏。

### 7.6 代理、鉴权和可观测性

- SSE 不要被 CDN/Nginx 缓冲；部署环境必须验证首 token 是否真正流式到达。
- `fetch` 不会自动复用 Axios 拦截器。若认证依赖 token 刷新，要么为 fetch 设计统一认证封装，要么让后端使用安全的 Cookie 会话；不能在多个 AI 组件中各自读取 `localStorage`。
- 日志中记录 `requestId`、用户 ID、文档 ID、动作类型、耗时、完成/取消/失败原因；不要记录完整正文和敏感 Prompt。
- 统计建议展示次数、点击率、采纳率、忽略率、取消率、首 token 耗时和失败率，用数据调整触发阈值。

---

## 8. 成本、隐私和权限边界

### 8.1 调用策略

1. 本地规则先行；
2. 本地提示不等于模型调用；
3. 用户点击操作后才调用 LLM；
4. 一次请求只发送完成任务所需的最少文本；
5. 对每个用户、动作类型和文档维度限流；
6. 明确输出长度上限；
7. 取消请求时停止上游模型调用。

### 8.2 权限原则

- 前端传 `documentId`，后端从登录态识别用户；
- 后端校验用户是否为文档拥有者或协作者，再读取内容；
- 不能只相信前端传的 `userId`、`documentContext` 或权限标记；
- AI 返回内容应视为不可信文本，按普通文本渲染，不允许直接注入 HTML；
- 日志、分析事件中不保存完整文档正文和选区文本。

### 8.3 为什么现在不做 RAG

RAG 不是“接入 AI”的必选项。它适合跨大量文档进行检索、需要外部知识库或内容无法整体放入上下文的场景。当前项目先做到：权限正确、上下文最小化、结果可追溯、流式可取消，会比仓促接入向量数据库更能体现成熟度。

---

## 9. 实施路线与提交边界

### 阶段 A：先修 AI 基础设施

建议分支：`feature/refactor-ai-action`

交付：

1. 从现有 `AiModel.vue` 抽离 `useAIAction`；
2. 重构流式解析器，支持事件协议、取消、错误分类、超时和 requestId 防旧响应；
3. 关闭面板、路由切换、组件卸载时统一取消；
4. AI 结果先预览，用户点击后才替换选区；
5. 运行构建并手测取消、断网、重复点击和关闭面板。

### 阶段 B：实现情境触发

建议分支：`feature/proactive-ai-hints`

交付：

1. `useAITrigger` 管理选区与粘贴信号；
2. `AiInlineHint` 仅展示本地提示；
3. 内容指纹、冷却时间、忽略后不再打扰；
4. 最小设置：总开关和提示类型开关；
5. 验证多人协同下提示不会被同步。

### 阶段 C：实现 Markdown 质量检查

建议分支：`feature/markdown-quality-check`

交付：

1. 纯函数 `markdownChecker` 和单元测试；
2. 在保存成功后触发；
3. 问题面板、跳转行号、单项忽略；
4. 验证大文档下不会影响输入和保存。

### 阶段 D：受权限保护的文档问答（可选）

在前面三个阶段稳定后再做。此阶段包含后端接口协议改造，因此不要与纯前端重构混在同一个提交中。

---

## 10. 测试清单

### 单元测试

- Markdown 规则：正常输入、边界行、多个代码块、中文/英文混合；
- 触发策略：长度阈值、冷却时间、已忽略内容、重复粘贴；
- SSE 解析器：一个 chunk 多事件、一个事件跨多个 chunk、非法 JSON、`done`、`error`；
- `useAIAction`：取消后不更新状态、旧 requestId 结果被丢弃。

### 手工验证

- 选中文本、取消选择、继续输入时操作条是否正确隐藏；
- 生成中关闭面板后网络请求是否取消；
- 断网、429、401、5xx 时文案和重试行为是否符合预期；
- 两个浏览器协同编辑：A 的提示、候选结果和忽略记录不应出现在 B 端；
- A 采纳结果后，B 应只看到最终写入文档的变更；
- 慢网络下首 token、流式更新和错误提示是否可理解。

---

## 11. 面试表达模板

可以这样介绍这部分设计：

> 我没有把 AI 做成几个按钮调用接口，而是设计成“行为信号—触发策略—用户确认—可取消流式执行—结果采纳”的链路。粘贴、选区和保存成功只触发本地建议，避免无意消耗模型成本；模型输出先进入个人预览，用户明确采纳后才写入 CodeMirror 并由 Yjs 同步，因此个人 AI 提示不会污染协作状态。\n> \n> 传输层使用 SSE 承载模型单向 token 流，协同 WebSocket 只处理 Yjs 和在线状态。前端用 AbortController 在关闭面板、切换路由或发起新请求时取消流；后端感知连接关闭后中止上游模型请求，避免成本泄漏。断联时不盲目续传生成，而是保留部分文本并让用户选择重试，这是因为生成结果通常没有可靠的断点续传语义。\n> \n> 文档问答不由前端上传整篇内容，而是只提交 documentId 和问题，由后端鉴权、选择最小必要上下文后再调用模型。对于标题层级和 Markdown 格式等确定性问题，我用本地规则检查而非 LLM，以获得可解释、稳定且零 token 成本的结果。

---

## 12. 参考资料

- OpenAI, [A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)：从可控的单一工作流开始，并在人类介入重要的流程中保留确认机制。
- Anthropic, [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)：上下文应以高信号、最小必要为原则，而不是无差别塞入全部内容。

