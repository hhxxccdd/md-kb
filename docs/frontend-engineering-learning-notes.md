# 前端工程化学习与面试问题记录

> 用途：记录在 MD-KB 重构过程中遇到的真实问题。每个问题都应包含：现象、代码链路、原理、工程化结论，以及面试时可以如何说明。

## 1. 新建文档时，“第一次保存”保存的是什么？

### 问题

用户先访问 `/edit`，此时 URL 中没有文档 id：

```text
/edit
↓
id = undefined
```

用户输入内容后，第一次自动保存到底保存了什么？为什么之后会跳转到 `/edit/456`？

### 当前项目中的真实流程

`frontend/src/component/editor/MyMdEditor.vue` 内部维护 `editorContent`。内容变化后，会执行：

```text
editorContent 变化
↓
300ms 防抖解析 Markdown 第一行，得到 title
↓
800ms 防抖执行 saveDoc()
```

第一次保存时还没有 `id`，因此 `saveDoc()` 走创建分支：

```ts
const res = await createDocument({
  title: title.value,
  content: editorContent.value,
})

router.push(`/edit/${res.data.id}`)
```

发送给后端的是：

```json
{
  "title": "从 Markdown 第一行解析出的标题",
  "content": "用户当前输入的完整 Markdown 内容"
}
```

后端 `backend/src/modules/doc/service.ts` 的 `createDocument()` 会在一个数据库事务中完成：

```text
创建 Document
├── title
├── content
├── owner_user_id = 当前登录用户
├── last_edited_by = 当前登录用户
├── version = 1
├── is_shared = false
└── is_deleted = false

创建 DocumentCollaborator
├── document_id = 新文档 id
└── user_id = 当前登录用户
```

后端返回新建文档，其中包含数据库生成的 id，例如：

```json
{
  "id": 456,
  "title": "我的第一篇文档",
  "content": "# 我的第一篇文档",
  "version": 1
}
```

前端因此跳转：

```text
/edit
↓ 第一次 HTTP 自动保存，创建数据库文档
/edit/456
```

### 为什么首次不直接走 Yjs 协同？

协同连接需要一个稳定的 `docId`，因为 WebSocket 房间、服务端 Yjs 文档、权限校验和数据库持久化都依赖这个 id：

```text
WebSocket: ?docId=456
服务端房间: room(456)
协同权限: 当前用户是否是 document 456 的 collaborator
Yjs 状态: serverYDoc(456)
数据库保存: Document(id = 456)
```

新建页面 `/edit` 尚未对应数据库记录，因此先通过普通 HTTP 创建文档；拿到 id 后，页面才应切换到协同编辑模式。

### 和当前重构的关系

当前 bug 的关键在于：

```text
/edit
↓ 创建文档并得到 id
/edit/456
↓
EditorPage 组件通常被 Vue Router 复用
↓
onMounted 不会再次运行
↓
没有重新加载文档和启动 Yjs / WebSocket 协同
```

因此要监听当前文档 id：

```ts
watch(id, (docId) => {
  if (!docId) return
  void loadDocument(docId)
}, { immediate: true })
```

### 工程化结论

1. 新建文档与编辑已有文档是两个不同的业务状态。
2. 组件是否挂载，不等于当前业务对象是否发生变化。
3. `route.params.id` 才是“当前编辑哪篇文档”的业务标识，应作为加载和协同初始化的触发源。
4. 首次创建文档使用 HTTP，取得稳定 id 后再初始化协同，是清晰的状态切换方式。
5. 创建 `Document` 与创建 `DocumentCollaborator` 必须放在同一数据库事务中，避免出现“文档存在但创建者没有权限”的不一致状态。

### 面试表达参考

> 新建文档时还没有持久化 id，无法建立以文档 id 为维度的 WebSocket 房间和 Yjs 状态，所以先通过防抖 HTTP 保存创建 Document，并在同一事务中写入创建者的协作者关系。后端返回 id 后，前端路由从 `/edit` 变为 `/edit/:id`。由于 Vue Router 会复用页面组件，我监听路由 id 而不是只依赖 `onMounted`，在 id 生成后重新执行文档加载和协同初始化。

### 后续可以继续追问

- 用户第一次输入后立刻关闭页面，创建请求还未完成怎么办？
- 创建文档成功但跳转协同连接失败，应该如何恢复？
- 为什么标题解析防抖是 300ms、保存防抖是 800ms？两者是否存在竞态？
- 新建文档后为什么要避免同一 CodeMirror 实例重复挂载 Yjs 扩展？

## 2. 为什么新建文档时可能只保存了一部分文字？

### 问题

在尚未监听路由 id 的旧实现中，用户从 `/edit` 新建文档后，刷新页面可能发现只有前面的一部分文字被保存。是不是 800ms 防抖导致文字丢失？

### 结论

防抖本身不会主动截断文字。当前 `saveDoc()` 运行时读取的是当时最新的 `editorContent.value`，因此只要用户停止输入至少 800ms，它会保存那一刻的完整编辑器内容。

更可能的问题是：第一次创建文档成功后，页面进入了一个不完整的状态切换。

### 旧实现中的时序

```text
用户在 /edit 输入“第一段内容”
↓
停止输入 800ms
↓
普通 HTTP 自动保存执行 createDocument()
↓
请求体保存“第一段内容”
↓
后端返回新文档 id，例如 456
↓
前端跳转到 /edit/456
↓
collabMode 变为 true，普通自动保存停止
↓
但 EditorPage 的 onMounted 不会再次执行
↓
Yjs / WebSocket 协同没有启动
↓
用户继续输入“第二段内容”
↓
内容只存在浏览器编辑器里，没有普通保存，也没有协同保存
↓
刷新页面后，只能从数据库恢复“第一段内容”
```

因此，用户感受到的是“只保存了一部分”，实际是：**文档创建请求发出时的内容已经保存；之后在错误状态下继续输入的内容没有进入任何保存链路。**

### 防抖在这里真正做什么？

当前实现中：

```text
内容每变化一次
↓
取消旧的保存计时器
↓
重新等待 800ms
↓
用户停止输入 800ms 后再保存
```

防抖的目的不是减少内容，而是避免用户连续输入时发送大量 HTTP 请求。

例如用户连续输入 100 个字符：

```text
不使用防抖：可能发送 100 次更新请求
使用防抖：停止输入后发送 1 次，内容为停止时的完整内容
```

### 如果 800ms 内完全没有输入呢？

不会创建文档。

防抖不是页面打开后自动运行的计时器，它是由 `editorContent` 的变化触发的：

```text
进入 /edit 后完全不输入
↓
editorContent 没有变化
↓
watch(editorContent) 不执行
↓
不会创建防抖计时器
↓
不会调用 saveDoc()
↓
不会创建 Document
```

只有用户至少输入过一次内容，随后停止输入满 800ms，才会触发第一次创建：

```text
输入“你好”
↓
editorContent 变化
↓
开始等待 800ms
↓
期间不再输入
↓
saveDoc()
↓
当前没有 id，因此调用 createDocument()
```

这里不是“新建文档兜底”，而是 `saveDoc()` 根据当前是否已有 id 分支处理：

```text
有 id    → 更新已有文档
没有 id  → 创建新文档
```

此外，`saveDoc()` 当前包含 `if (!editorContent.value) return`，因此空字符串不会创建空文档。是否允许只输入空格就创建文档，是后续可以通过内容校验明确的产品规则。

### 这里还存在的竞态风险

创建文档是异步请求。在它发出到后端返回 id 的这段时间内，用户仍可能继续输入。

旧实现没有明确的 `creating` 状态，也没有统一的新建文档状态机，因此在网络较慢时可能出现：

- 第一次创建请求保存较早内容；
- 用户继续输入又触发新的防抖保存；
- 第二个保存执行时，第一个创建请求尚未返回 id，可能再次走创建分支；
- 或第一个请求先返回，后续输入却因协同未初始化而不再保存。

这说明问题不只是防抖，而是“异步创建 + 路由变化 + 保存模式切换”没有被统一管理。

### 工程化结论

1. 防抖解决的是请求频率，不是文档状态切换。
2. 新建、创建中、已有文档、协同连接中、协同编辑应是明确的状态。
3. 不能只通过 `Boolean(id)` 决定是否停止普通保存；还应确认协同连接是否已经准备好。
4. 路由 id 变化后必须重新初始化协同，避免出现“普通保存停了，协同保存未启动”的空档。
5. 未来应考虑显式的创建中状态或单飞 Promise，避免网络慢时重复创建文档。

### 面试表达参考

> 我曾遇到过新建文档后只持久化部分内容的问题。最初以为是防抖导致，但排查后发现防抖保存的是触发时的完整编辑器状态。根因是首次 HTTP 创建成功后路由拿到了 id，普通自动保存被协同模式关闭，而页面因路由复用没有重新初始化 WebSocket 和 Yjs，后续输入没有进入任何持久化链路。修复时我监听文档 id，明确创建与协同状态的切换，并对异步创建过程考虑重复请求和资源初始化时序。

## 编辑器异步与生命周期：高频追问

### 用户第一次输入后立刻关闭页面，创建请求还未完成怎么办？

不能认为“请求已发出”就等于“文档已创建”。页面关闭时，普通异步请求不保证完成。前端应在路由离开或组件卸载时取消已经失效的请求，并将未持久化草稿保存到 `localStorage` 或 IndexedDB，供用户下次进入时恢复；后端应支持幂等键，避免同一次创建重试时产生重复文档。

面试表达：前端负责取消失效请求与保留草稿，后端用幂等能力兜底重复创建，二者共同保证体验和数据一致性。

### 创建文档成功但协同连接失败，应该如何恢复？

创建成功和协同连接成功是两个独立阶段。创建成功后文档已有 `id`，状态进入 `initializing-collab`；若 WebSocket 失败，则进入可恢复的 `collab-failed`，保留当前内容和 `id`，展示重试状态并按指数退避重连。重连后才进入 `collaborating`。

如果产品需要临时降级为 HTTP 保存，也必须明确该模式没有实时协同能力，不能悄悄混用两套写入通道。

### 为什么标题解析防抖是 300ms、保存防抖是 800ms？两者是否存在竞态？

300ms 用于轻量、需要较快反馈的标题解析；800ms 用于会触发网络请求的持久化，以减少请求数量。这不是固定标准，应结合输入体验、接口耗时和埋点调整。

两者存在竞态：如果标题解析是异步的，800ms 的保存可能读到旧标题。保存应从同一份内容快照同步推导标题，或给异步解析加版本号，只接受最新版本的结果。

### 新建文档后为什么要避免同一 CodeMirror 实例重复挂载 Yjs 扩展？

Yjs 扩展会把 CodeMirror 的编辑事务和 `Y.Text` 双向绑定。同一个实例重复挂载可能让同一次输入被监听、同步或发送多次，导致重复 WebSocket 更新、光标异常、内存泄漏和内容问题。

协同初始化必须幂等：同一文档、同一编辑器只初始化一次；切换文档时先销毁旧 WebSocket、Yjs 文档和监听器，再初始化新文档。仅检查 `collab` 是否存在还不够，还要确认它对应当前 `docId`，以及旧资源是否已释放。

## 后续必做：编辑器首屏性能与产物拆包

当前生产构建中，编辑器相关 JavaScript 产物约为 987KB（gzip 后约 339KB），超过 Vite 默认的 500KB 警告阈值。它不影响功能正确性，但会增加首次进入编辑页的下载、解析与执行时间，应作为独立性能优化阶段完成。

### 优化目标

1. 首页、登录页等非编辑场景不下载 CodeMirror、Yjs、Markdown 解析和 AI 编辑器依赖。
2. 进入编辑页时再按需加载编辑器模块。
3. 将体积大的稳定依赖拆分为可长期缓存的独立 chunk。
4. 用构建产物体积和浏览器 Network/Performance 数据验证效果，而不是只修改打包配置。

### 实施顺序

```text
先完成文档生命周期正确性
↓
路由懒加载 EditorPage
↓
编辑器内部动态导入 CodeMirror / Yjs 等重依赖
↓
按依赖边界配置 manualChunks（避免按文件名随意拆分）
↓
对比优化前后的 chunk 体积、首次加载请求和可交互时间
```

### 面试表达参考

> 我在生产构建中发现协同编辑器页面的单个 chunk 接近 1MB。先通过路由懒加载避免非编辑页面加载编辑器依赖，再根据依赖边界将 CodeMirror、协同编辑和业务代码拆分为可缓存 chunk，并使用构建分析和浏览器性能面板对比优化前后的首屏网络与执行成本。优化时我会关注模块边界和真实指标，而不只是为了消除构建警告。

## 架构复盘：新建文档职责为什么不能分散在编辑器组件和页面组件中？

旧实现中，`MyMdEditor` 同时监听内容、防抖、调用创建/更新接口并跳转路由；`EditorPage` 则读取路由 id、加载文档、初始化和销毁 WebSocket/Yjs。两者分别掌握同一个业务流程的一部分：

```text
用户输入
↓
MyMdEditor 创建文档并跳转路由
↓
EditorPage 感知 id 变化
↓
EditorPage 初始化协同资源
```

这会造成职责混乱：子组件不知道创建成功后协同是否准备完毕，父组件也无法控制创建请求是否重复、失败后如何重试，导致“有了 id 就关闭 HTTP 保存，但协同尚未可用”的状态空档。

### 重构后的职责边界

```text
MyMdEditor
→ 只处理编辑器呈现、输入、选区和内容变化事件

EditorPage / useDocumentLifecycle
→ 管理文档状态机、创建请求、路由切换、协同初始化与资源销毁

documentApi
→ 只封装 create / get / update 等 HTTP 请求
```

业务状态应放在拥有完整上下文的一方。这里的路由、文档 id、协同连接和页面卸载都属于页面级上下文，因此文档生命周期不应由通用编辑器组件决定。

### 面试表达参考

> 我在协同编辑器重构中发现，新建文档流程被拆在编辑器子组件和页面组件中：子组件创建文档并跳转，页面组件负责协同初始化。这使得异步创建、路由变化和保存模式切换缺少统一的状态归属。我将创建与协同状态收敛到页面层的文档生命周期中，编辑器组件只向上发出内容变化事件。这样可以控制创建请求单飞、明确失败恢复路径，也让 WebSocket/Yjs 的资源清理有唯一责任方。

## 协同 composable：三个运行时流程与代码对应

`useDocumentCollaboration` 把 Yjs、WebSocket、在线用户监听和资源销毁从 `EditorPage` 中抽离。页面只决定“何时初始化/销毁”以及“事件发生后页面状态如何变化”。

### 1. 打开已有文档并建立协同

页面同时依赖两项条件：HTTP 文档请求完成，以及 `MyMdEditor` 已创建 CodeMirror 的 `EditorView`。

```ts
// EditorPage.vue：HTTP 请求成功后标记文档信息已准备，并尝试初始化。
const loadDocument = async (docId: string) => {
  const res = await getDocumentById(Number(docId))
  doc.value = res.data
  initialDocumentContent.value = res.data.content ?? ''
  tryInitializeDocumentCollaboration()
}

// EditorPage.vue：编辑器就绪时保存 EditorView，并再次尝试初始化。
const handleEditorReady = (view: EditorView) => {
  editorView.value = view
  tryInitializeDocumentCollaboration()
}

// 只有两个条件同时满足才进入协同初始化。
const tryInitializeDocumentCollaboration = () => {
  const documentId = id.value

  if (!documentId || !editorView.value || initialDocumentContent.value === undefined) {
    return
  }

  initializeDocumentCollaboration(documentId, editorView.value)
}
```

真正的底层初始化位于 composable：

```ts
// useDocumentCollaboration.ts
const initialize = (documentId: string, view: EditorView) => {
  if (collab) return // 同一实例不重复初始化

  yjsMarkdown = useYjsMarkdown({
    initialContent: '',
    onLocalUpdate: (update) => {
      options.onLocalChange()
      collab?.sendYUpdate(update)
    },
  })

  view.dispatch({
    effects: StateEffect.appendConfig.of(yjsMarkdown.collabExtension),
  })

  collab = UseCollabSocket({
    docId: documentId,
    onYUpdate: (update) => yjsMarkdown?.applyRemoteUpdate(update),
    onSaved: options.onSaved,
    onRecoonect: options.onReconnected,
  })

  collab.connect()
}
```

这里传入空 `initialContent` 是有意为之：协同内容的权威来源是服务端的 `y-sync` 消息，而不是 HTTP 响应内容。HTTP 请求目前承担权限校验、元数据获取和初始化时机门槛的作用。

```ts
// EditorPage.vue：连接成功后，页面根据 composable 的事件进入协同状态。
onConnected: () => {
  documentLifecycle.value = 'collaborating'
}
```

### 2. 本地编辑到“已保存”

```ts
// useYjsMarkdown.ts：本地编辑会产生 Yjs update。
ydoc.on('update', (update, origin) => {
  if (origin === 'init' || origin === 'remote') return
  options.onLocalUpdate?.(Array.from(update))
})
```

```ts
// useDocumentCollaboration.ts：页面先显示未保存，再将更新发到协同服务。
onLocalUpdate: (update) => {
  options.onLocalChange()
  collab?.sendYUpdate(update)
}

// EditorPage.vue：页面对业务状态作出响应。
onLocalChange: () => {
  status.value = '未保存'
}
```

服务端完成持久化后发送 `saved` 消息，WebSocket 封装会调用 `onSaved`：

```ts
// EditorPage.vue
onSaved: () => {
  status.value = '已保存'
}
```

因此“已保存”不是刚发送 WebSocket 时就显示，而是后端确认已落库后才显示。

### 补充：`MyMdEditor` 的内容为什么会进入 Yjs？

这里有两条并行但用途不同的数据通道，不能混为一谈：

```text
通道 A：页面业务数据
MyMdEditor 的 editorContent
→ emit('update:editorContent', content)
→ EditorPage.handleEditorContentChange
→ 新建文档、防抖创建、导出、AI 上下文等页面业务

通道 B：协同编辑数据
CodeMirror 编辑事务
→ yCollab(ytext, awareness) 扩展
→ Y.Text
→ Y.Doc update
→ WebSocket y-update
```

`@update:editorContent` 不负责把文本发送给 Yjs。页面拿到 `EditorView` 后，把 Yjs 的 CodeMirror 扩展挂载到同一个编辑器实例：

```ts
// useDocumentCollaboration.ts
yjsMarkdown = useYjsMarkdown({
  initialContent: '',
  onLocalUpdate: (update) => {
    options.onLocalChange()
    collab?.sendYUpdate(update)
  },
})

view.dispatch({
  effects: StateEffect.appendConfig.of(yjsMarkdown.collabExtension),
})
```

`collabExtension` 的实际来源是：

```ts
// useYjsMarkdown.ts
const collabExtension = yCollab(ytext, awareness)
```

`yCollab` 是 CodeMirror 与 `Y.Text` 的双向绑定：用户在 CodeMirror 输入时，扩展将编辑事务写入 `Y.Text`；`Y.Text` 变化会触发 `Y.Doc` 的 `update` 事件；本地 update 再被发送到 WebSocket。

```text
用户在 MyMdEditor 内部的 CodeMirror 输入
↓
CodeMirror transaction
↓
yCollab 扩展写入 Y.Text
↓
ydoc.on('update') 识别为本地更新
↓
onLocalUpdate(update)
↓
collab.sendYUpdate(update)
```

反方向也成立：服务端发送 `y-update` 后，`applyRemoteUpdate` 写入 `Y.Doc`，`yCollab` 自动把变化反映到 CodeMirror。远端更新使用 `origin: 'remote'`，所以不会再次发回 WebSocket，避免回声循环。

### 3. 切换文档或离开页面时释放资源

```ts
// EditorPage.vue：路由 id 改变时，先取消草稿创建并释放旧协同资源。
watch(id, (docId, previousDocId) => {
  cancelScheduleCreation()
  if (docId === previousDocId) return

  resetDocumentCollaboration()
  editorView.value = undefined

  // 然后才加载新文档并初始化新协同连接。
  if (docId) void loadDocument(docId)
}, { immediate: true })

onBeforeUnmount(() => {
  cancelScheduleCreation()
  resetDocumentCollaboration()
})
```

```ts
// useDocumentCollaboration.ts：真正的资源释放与创建顺序相反。
const dispose = () => {
  stopOnlineUsersWatch?.()
  stopOnlineUsersWatch = undefined

  stopConnectedWatch?.()
  stopConnectedWatch = undefined

  collab?.close()
  collab = null

  yjsMarkdown?.destroy()
  yjsMarkdown = null

  onlineUsers.value = []
}
```

资源不只会在组件卸载时失效。`/edit/123` 切到 `/edit/456` 时，Vue Router 可能复用同一个 `EditorPage` 实例，因此必须在路由 id 变化时主动调用 `dispose()`，不能只依赖 `onBeforeUnmount`。
