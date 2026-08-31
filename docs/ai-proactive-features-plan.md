# MD-KB 主动式 AI 功能规划

> 目标：从"用户手动触发 AI"演进为"AI 主动感知、智能提示"，同时控制性能和成本开销。

---

## 一、现状分析

### 当前 AI 架构

```
用户选中文本 → 点击按钮 → 打开 Modal → SSE 流式返回
```

| 功能 | 触发方式 | 入口 |
|------|---------|------|
| AI 润色 | 手动选中 + 点击按钮 | `EditorPage.vue` → `AiModel.vue` |
| AI 翻译 | 手动选中 + 点击按钮 | 同上 |
| 文档问答 | 手动点击按钮 | 同上 |

**问题**：用户必须知道 AI 能做什么才会去点，等于把 AI 当成一个"外部工具"而非"智能助手"。

### 现有基础设施（可复用）

| 组件 | 路径 | 复用点 |
|------|------|--------|
| WebSocket 协同通道 | `backend/src/modules/collab/server.ts` | 已有 `ping/pong/y-update/presence` 消息类型，可扩展 `ai-hint` |
| SSE 流式工具 | `backend/src/modules/ai/sse.ts` + `frontend/src/utils/aiStream.ts` | AI 结果流式返回 |
| Prompt 模板 | `backend/src/modules/ai/prompt.ts` | 新增检测类 prompt |
| 编辑器封装 | `frontend/src/component/editor/MyMdEditor.vue` | 暴露 `getContent()`/`getSelectedText()` |
| 协同 Socket | `frontend/src/composables/useCollabSocket.ts` | 可扩展消息类型 |
| AI 限流中间件 | `backend/src/middleware/rateLimit.ts` | 10 req/min，可复用 |

---

## 二、核心设计原则

### 分层架构：前端轻检测 → 智能触发 → 后端 LLM

```
┌─────────────────────────────────────────────────────────────┐
│                    第一层：前端本地检测                        │
│              零 API 开销，纯文本分析，实时运行                  │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 结构检测  │ │ 粘贴检测  │ │ 选中悬停  │ │ 字数统计  │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │             │              │
│       ▼            ▼            ▼             ▼              │
│  ┌─────────────────────────────────────────────────┐        │
│  │           触发条件判断器 (Trigger Engine)          │        │
│  └─────────────────────┬───────────────────────────┘        │
│                        │ 条件满足                            │
├────────────────────────┼────────────────────────────────────┤
│                        ▼                                    │
│              第二层：智能触发 LLM                             │
│         只在"值得调"的时候调，控制成本                         │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │  用户行为 → 意图推断 → 展示候选提示 → 用户确认      │        │
│  │                                                 │        │
│  │  粘贴 500 字英文 → "需要翻译吗？" → [是] → 调 LLM  │        │
│  │  选中悬停 2 秒  → "需要润色吗？"  → [是] → 调 LLM  │        │
│  │  保存文档       → "检测到问题，查看建议？"           │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                    第三层：非侵入式展示                        │
│              行内气泡 / 状态栏提示，不打断编辑流                │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │  编辑器内浮动气泡：[✨ AI 建议] [采纳] [忽略]       │        │
│  │  状态栏文字提示：  "检测到可优化内容"               │        │
│  │  侧边栏面板：     完整建议列表                     │        │
│  └─────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

### 核心约束

| 约束 | 策略 |
|------|------|
| **性能** | 前端检测全部 O(n) 文本操作，不阻塞编辑器主线程 |
| **成本** | LLM 调用必须经过用户确认或明确意图信号，绝不盲目轮询 |
| **体验** | 非侵入式提示，用户可一键忽略，不打断编辑流 |
| **可控** | 用户可在设置中关闭主动提示，或调整灵敏度 |

---

## 三、功能清单与优先级

### P0 - 第一批实现（投入产出比最高）

#### 3.1 粘贴智能检测 + 操作建议

**场景**：用户从外部粘贴大段文本（可能是从网页、ChatGPT、英文文档复制来的）

**触发条件**：
- 监听 `paste` 事件
- 粘贴内容 > 100 字符
- 内容不是纯 Markdown 格式（无标题/代码块等）

**提示方式**：粘贴完成后 1 秒内，在粘贴位置下方弹出行内气泡

```
┌─────────────────────────────────┐
│ ✨ 检测到粘贴内容，需要帮助吗？    │
│ [润色] [翻译成中文] [忽略]        │
└─────────────────────────────────┘
```

**智能判断**：
- 粘贴内容中英文字符占比 > 70% → 默认显示"翻译成中文"
- 粘贴内容中文字符占比 > 70% → 默认显示"润色"
- 混合内容 → 显示两个选项

#### 3.2 选中文本悬停提示

**场景**：用户选中了一段文本，鼠标悬停不动（暗示想做什么但不知道有 AI 功能）

**触发条件**：
- `selectionchange` 事件检测到有选中文本
- 选中文本长度 > 20 字符
- 悬停时间 > 2 秒（debounce）

**提示方式**：在选中文本附近显示浮动工具条

```
┌───────────────────────────────────────┐
│ ✨ AI 操作：[润色] [翻译] [解释]       │
└───────────────────────────────────────┘
```

**关闭条件**：
- 用户点击任意按钮
- 用户取消选中
- 用户继续输入
- 3 秒无操作自动消失

#### 3.3 文档结构健康检查（保存时触发）

**场景**：用户保存文档时，自动检测文档结构问题

**触发条件**：
- 文档保存事件（`saveDoc` 完成后）
- 文档内容 > 200 字符

**检测项**（全部前端本地完成，不调 LLM）：

| 检测项 | 方法 | 严重程度 |
|--------|------|---------|
| 标题层级跳跃 | 正则：`#` 后直接 `###`（跳过 `##`） | warning |
| 图片缺少 alt | 正则：`![](...)` | info |
| 链接格式异常 | 正则：`[text]()` 空 URL | warning |
| 空标题 | 正则：`# ` 后无内容 | warning |
| 代码块未闭合 | 计数：`` ``` `` 开闭不匹配 | error |

**提示方式**：状态栏 + 可展开的检查面板

```
状态栏：⚠️ 检测到 2 个结构问题  [查看详情]

展开后：
┌─────────────────────────────────────────┐
│ ⚠️ 文档结构检查                          │
│                                          │
│ 🔴 第 15 行：代码块未闭合                  │
│ 🟡 第 8 行：标题层级跳跃（# → ###）        │
│ 🟡 第 22 行：图片缺少 alt 文本             │
│                                          │
│ [跳转到问题位置]  [全部忽略]               │
└─────────────────────────────────────────┘
```

### P1 - 第二批实现

#### 3.4 文档摘要自动生成

**场景**：文档超过一定长度后，在文档管理页（`adminPage.vue`）自动显示 AI 生成的摘要

**触发条件**：
- 文档内容 > 500 字符
- 文档首次打开 / 内容发生重大变化（版本号变化 > 5）

**实现**：
- 后端新增 `/api/ai/summarize` 接口
- 前端在 `documentCard.vue` 中展示摘要（截断到 80 字）
- 摘要缓存到 `Document` 表的 `summary` 字段，避免重复调用

**数据库变更**：
```prisma
model Document {
  // ... 现有字段
  summary   String?    @db.Text  // AI 生成的摘要
}
```

#### 3.5 编辑时实时语法/风格提示

**场景**：用户输入过程中，检测到可改进的文本风格问题

**触发条件**：
- 用户停止输入 > 3 秒（idle debounce）
- 文档内容 > 200 字符
- 距离上次检测 > 30 秒（节流）

**检测项**（前端本地）：

| 检测项 | 方法 | 提示 |
|--------|------|------|
| 连续重复词 | 正则：`(\b\w+\b)\s+\1` | "检测到重复用词" |
| 过长句子 | 句子 > 100 字符 | "建议拆分长句" |
| 被动语态过多 | 简单启发式检测 | "建议使用主动语态" |
| 口语化表达 | 本地词库匹配 | "建议使用书面语" |

**提示方式**：编辑器底部状态栏文字提示，不弹窗

```
状态栏：💡 建议：第 12 行有重复用词"功能"  [跳转]
```

### P2 - 第三批实现（高级功能）

#### 3.6 智能续写 / 自动补全

**场景**：用户写到一半停下来，AI 推测接下来要写的内容

**触发条件**：
- 用户停止输入 > 5 秒
- 光标在行尾
- 当前行以句号、冒号、换行结尾（暗示"接下来要继续"）
- 文档内容 > 100 字符

**实现**：
- 前端发送光标前的上下文（最近 500 字符）到后端
- 后端调 LLM 生成续写建议（限制 50 字以内）
- 前端以灰色 ghost text 显示（类似 GitHub Copilot）
- 用户按 `Tab` 接受，按 `Esc` 忽略

**后端新增**：
```typescript
// prompt.ts 新增
suggestNext: (context: string) => `
你是技术文档写作助手。根据以下上下文，预测作者接下来最可能要写的内容。
规则：
1. 只续写 1-2 句话（不超过 50 字）
2. 保持与上文风格一致
3. 只输出续写内容，无任何解释
4. 如果上下文不足以预测，输出空字符串

上下文：
${context}
`
```

#### 3.7 文档版本对比 + AI 变更说明

**场景**：查看文档历史版本时，AI 自动生成两个版本之间的变更摘要

**触发条件**：
- 用户打开版本对比面板
- 两个版本内容差异 > 50 字符

**实现**：
- 后端新增 `/api/ai/diff-summary` 接口
- 输入：两个版本的内容
- 输出：结构化变更说明（新增了什么、删除了什么、修改了什么）

---

## 四、技术实现方案

### 4.1 前端：触发引擎（Trigger Engine）

新建 `frontend/src/composables/useAITrigger.ts`：

```typescript
// 核心接口设计
interface AITriggerOptions {
  getContent: () => string           // 获取当前文档内容
  getEditorView: () => EditorView    // 获取 CodeMirror 实例
  onTrigger: (hint: AIHint) => void  // 触发回调
  enabled: boolean                   // 总开关
  settings: {
    idleDelay: number        // 空闲检测延迟（默认 3000ms）
    pasteThreshold: number   // 粘贴检测阈值（默认 100 字符）
    selectionDelay: number   // 选中悬停延迟（默认 2000ms）
    saveCheck: boolean       // 保存时是否检查（默认 true）
  }
}

interface AIHint {
  type: 'paste' | 'selection' | 'save-check' | 'idle'
  suggestion: string           // 建议文本
  actions: AIAction[]          // 可选操作
  position: { top: number; left: number }  // 提示位置
  context?: string             // 相关文本片段
}

interface AIAction {
  label: string                // 按钮文字
  mode: 'polish' | 'translate' | 'summarize' | 'explain'
  params?: Record<string, any>
}
```

**事件监听策略**：

```typescript
// 1. 粘贴检测 — 直接监听 paste 事件
editorView.dom.addEventListener('paste', handlePaste)

// 2. 选中悬停 — selectionchange + mousemove 组合
document.addEventListener('selectionchange', debounce(checkSelection, 2000))

// 3. 空闲检测 — 在 editorContent watch 中 debounce
watch(editorContent, debounce(checkIdleContent, 3000))

// 4. 保存检测 — hook 保存成功事件
// 在 MyMdEditor 的 saveDoc 成功后 emit 'save-complete'
```

### 4.2 前端：行内提示组件

新建 `frontend/src/component/ai/AiInlineHint.vue`：

```vue
<template>
  <Teleport to="body">
    <Transition name="hint-fade">
      <div v-if="visible" class="ai-inline-hint" :style="positionStyle">
        <div class="hint-content">
          <span class="hint-icon">✨</span>
          <span class="hint-text">{{ suggestion }}</span>
        </div>
        <div class="hint-actions">
          <el-button
            v-for="action in actions"
            :key="action.label"
            size="small"
            :type="action.primary ? 'primary' : 'default'"
            @click="handleAction(action)"
          >
            {{ action.label }}
          </el-button>
          <el-button size="small" text @click="dismiss">忽略</el-button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

**定位策略**：
- 粘贴提示：粘贴位置下方 8px
- 选中提示：选区上方 8px（避免遮挡选中文本）
- 保存检查：编辑器右下角固定位置
- 使用 `getBoundingClientRect()` 从 CodeMirror 选区/光标获取精确坐标

### 4.3 后端：结构检查 API（可选，增强版）

如果需要更智能的结构检查（超出正则能力），可以新增轻量 API：

```typescript
// backend/src/modules/ai/controller.ts 新增
router.post('/check-structure', auth, async (req, res) => {
  const { content } = req.body
  // 先做前端能做的本地检查
  const localIssues = checkStructureLocally(content)
  // 如果本地发现问题，直接返回，不调 LLM
  if (localIssues.length > 0) {
    return success(res, { issues: localIssues, source: 'local' })
  }
  // 本地无问题时，可选择性调 LLM 做深度检查（用户确认后）
  // ...
})
```

**关键点**：本地检查优先，LLM 只作为增强。这样大部分情况不需要调 API。

### 4.4 后端：摘要缓存

```typescript
// 新增摘要接口
router.post('/summarize', auth, async (req, res) => {
  const { docId, content } = req.body

  // 检查是否已有缓存摘要
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { summary: true, version: true }
  })

  if (doc?.summary) {
    return success(res, { summary: doc.summary, cached: true })
  }

  // 调 LLM 生成摘要
  // 流式返回 + 写入数据库
})
```

### 4.5 WebSocket 消息扩展

在现有协同通道上增加 AI 相关消息类型：

```typescript
// collab/type.ts 新增
type CollabMessage =
  | { type: 'ping' }
  | { type: 'pong'; message: string }
  | { type: 'y-update'; update: number[]; userId?: number }
  | { type: 'y-sync'; update: number[] }
  | { type: 'presence'; users: OnlineUser[] }
  | { type: 'saved'; docId: number; updatedAt: string }
  | { type: 'error'; message: string }
  // 👇 新增
  | { type: 'ai-hint-response'; hintId: string; content: string }
```

**但注意**：AI 流式响应仍然走 SSE（已有基础设施），WebSocket 只用于轻量通知。

---

## 五、性能保障策略

### 5.1 前端性能

| 措施 | 说明 |
|------|------|
| **Web Worker** | 文本分析（正则匹配、字数统计）放到 Worker 线程，不阻塞主线程 |
| **Debounce/Throttle** | 所有检测都有防抖/节流，编辑密集时不触发 |
| **条件短路** | 文档 < 200 字符时跳过所有检测 |
| **缓存结果** | 相同内容不重复检测，用内容 hash 判断 |

```typescript
// Worker 中运行的检测函数
// frontend/src/workers/aiCheck.worker.ts
self.onmessage = (e) => {
  const { content, checks } = e.data
  const results = []
  for (const check of checks) {
    results.push(check(content))
  }
  self.postMessage(results)
}
```

### 5.2 后端成本控制

| 措施 | 说明 |
|------|------|
| **摘要缓存** | 摘要存数据库，内容未大幅变化时不重新生成 |
| **限流复用** | 复用现有 `rateLimit` 中间件（10 req/min） |
| **Token 限制** | 所有新增 prompt 限制输出 < 200 token |
| **廉价模型** | 摘要/检测用 `qwen-turbo`（最便宜），润色/翻译可选更高质量模型 |

### 5.3 用户体验保障

| 措施 | 说明 |
|------|------|
| **一键关闭** | 设置面板中提供"AI 主动提示"总开关 |
| **单条忽略** | 每个提示都可以单独忽略，并记住"不再提示此类问题" |
| **不重复打扰** | 同一类型提示 5 分钟内不重复出现 |
| **加载态** | LLM 调用期间显示轻量 loading 动画，不阻塞编辑 |

---

## 六、数据库变更

```prisma
// 新增用户 AI 偏好设置
model UserAIPreference {
  id                    Int      @id @default(autoincrement())
  user_id               Int      @unique
  proactive_enabled     Boolean  @default(true)   // 主动提示总开关
  paste_check           Boolean  @default(true)   // 粘贴检测
  selection_hint        Boolean  @default(true)   // 选中悬停提示
  save_check            Boolean  @default(true)   // 保存时检查
  idle_suggest          Boolean  @default(false)  // 空闲续写（默认关闭，较高级功能）
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  user User @relation(fields: [user_id], references: [id])
}

// Document 表新增字段
model Document {
  // ... 现有字段
  summary   String?    @db.Text  // AI 生成的摘要缓存
}
```

---

## 七、文件变更清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `frontend/src/composables/useAITrigger.ts` | AI 触发引擎核心逻辑 |
| `frontend/src/component/ai/AiInlineHint.vue` | 行内提示组件 |
| `frontend/src/component/ai/AiSettings.vue` | AI 偏好设置面板 |
| `frontend/src/workers/aiCheck.worker.ts` | Web Worker 文本检测 |
| `frontend/src/utils/textAnalysis.ts` | 文本分析工具函数（正则检测） |
| `backend/src/modules/ai/checker.ts` | 后端结构检查逻辑 |
| `backend/src/modules/ai/summarize.ts` | 摘要生成逻辑 |

### 修改文件

| 文件路径 | 变更内容 |
|---------|---------|
| `backend/src/modules/ai/prompt.ts` | 新增 `suggestNext`、`summarize`、`diffSummary` 模板 |
| `backend/src/modules/ai/controller.ts` | 新增 `/summarize`、`/check-structure` 路由 |
| `backend/prisma/schema.prisma` | 新增 `UserAIPreference` 表，`Document` 加 `summary` 字段 |
| `frontend/src/views/EditorPage.vue` | 集成 `useAITrigger` + `AiInlineHint` |
| `frontend/src/component/editor/MyMdEditor.vue` | 新增 `save-complete` 事件，暴露更多编辑器状态 |
| `frontend/src/component/card/documentCard.vue` | 展示文档摘要 |
| `frontend/src/composables/useCollabSocket.ts` | 新增 `ai-hint-response` 消息处理 |
| `backend/src/modules/collab/type.ts` | 新增 AI 相关消息类型 |

---

## 八、实现路线图

### Phase 1（1-2 周）— 基础主动提示

```
Week 1:
├── [ ] 实现 useAITrigger.ts 核心框架
├── [ ] 实现粘贴检测（paste 事件监听 + 意图推断）
├── [ ] 实现 AiInlineHint.vue 行内提示组件
└── [ ] 集成到 EditorPage.vue

Week 2:
├── [ ] 实现选中文本悬停提示
├── [ ] 实现保存时结构检查（前端本地正则）
├── [ ] 添加设置面板开关
└── [ ] 测试 + 优化动画/定位
```

**Phase 1 交付物**：用户粘贴文本时自动提示"润色/翻译"，选中文本悬停显示 AI 操作栏，保存时检测结构问题。

### Phase 2（2-3 周）— 智能增强

```
Week 3:
├── [ ] 实现摘要生成后端接口 + 缓存
├── [ ] documentCard 展示摘要
├── [ ] Web Worker 文本分析迁移
└── [ ] 后端 UserAIPreference CRUD

Week 4:
├── [ ] 实现实时语法/风格提示（idle 检测）
├── [ ] 重复词检测、长句检测等前端规则
├── [ ] 状态栏提示集成
└── [ ] 性能测试 + 优化
```

**Phase 2 交付物**：文档卡片显示摘要，编辑时实时风格提示，用户可配置 AI 偏好。

### Phase 3（3-4 周）— 高级功能

```
Week 5-6:
├── [ ] 实现智能续写（ghost text）
├── [ ] 实现版本对比 AI 变更说明
├── [ ] 完整测试 + 文档
└── [ ] 性能调优 + 生产部署
```

**Phase 3 交付物**：GitHub Copilot 风格的续写建议，版本对比变更摘要。

---

## 九、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 前端检测误报过多 | 用户反感，关闭功能 | 严格阈值 + 用户可调灵敏度 + "不再提示"记忆 |
| LLM 调用成本超预期 | 费用失控 | 摘要缓存 + 限流 + 廉价模型 + 用户确认后才调 |
| 行内提示遮挡编辑 | 打断编辑流 | 提示自动消失 + 位置避开光标 + 可拖拽/调整 |
| 协同模式下提示冲突 | 多人同时看到不同提示 | 提示仅本地显示，不通过 WebSocket 同步 |
| Web Worker 兼容性 | 部分浏览器不支持 | 降级到主线程（用 requestIdleCallback） |

---

## 十、效果预估

| 指标 | 当前 | Phase 1 后 | Phase 3 后 |
|------|------|-----------|-----------|
| AI 功能使用率 | 低（需要用户知道并主动点击） | 中（粘贴/选中自动提示） | 高（续写 + 全场景覆盖） |
| 用户感知 AI 价值 | "AI 是个工具" | "AI 在帮我" | "AI 是我的写作搭档" |
| LLM 调用量/用户/天 | ~2-3 次 | ~5-8 次（用户确认后） | ~10-15 次 |
| 编辑效率提升 | 基准 | +15-20% | +30-40% |
