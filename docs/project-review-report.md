# MD-KB 项目审查报告

> 审查日期：2026-06-16
> 审查范围：后端（Express + Prisma + WebSocket）、前端（Vue 3 + Pinia + Yjs）
> 问题总数：71 个（CRITICAL 7 / HIGH 18 / MEDIUM 22 / LOW 8）

---

## 一、CRITICAL — 必须立刻修复（7 个）

不修就是等着出事。涉及硬编码凭据泄露、token 暴露、接口鉴权缺失。

### C1. 邮箱密码硬编码在源码中

- **文件**：`backend/src/modules/user/config.ts` 第 23-25 行
- **现状**：
  ```typescript
  user: process.env.EMAIL_USER || '541033895@qq.com',
  pass: process.env.EMAIL_PASS || 'crxlaqmdleeubfgf',
  ```
- **风险**：任何有仓库权限的人都能拿到 QQ 邮箱密码，可以冒充系统发送邮件
- **修复**：删除硬编码 fallback，启动时校验环境变量是否存在，不存在则报错退出
  ```typescript
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  // 启动时 if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error('...')
  ```

### C2. JWT token 打印到控制台

- **文件**：`backend/src/modules/user/service.ts` 第 29-30 行
- **现状**：
  ```typescript
  console.log('accessToken:', accessToken)
  console.log('refreshToken:', refreshToken)
  ```
- **风险**：每次登录/注册/刷新都打印 token，生产环境日志系统、容器运行时都能看到
- **修复**：删除这两行 `console.log`

### C3. accessToken 在认证中间件中打印

- **文件**：`backend/src/modules/user/middleware.ts` 第 16 行
- **现状**：
  ```typescript
  console.log('====== accessToken:', accessToken, '======')
  ```
- **风险**：每个认证请求都打印 Bearer token
- **修复**：删除这行日志

### C4. AI 上下文接口无鉴权校验

- **文件**：`backend/src/modules/ai/context.ts` 第 17、41、53 行
- **现状**：
  - `POST /sessionId` 接受请求体中的任意 `user_id`，攻击者可以伪造他人身份创建/获取会话
  - `GET /context/:session_id` 任何已认证用户都能通过枚举 UUID 读取他人聊天记录
  - `POST /message` 任何已认证用户都能向任意会话注入消息
- **修复**：使用 `req.user.id`（来自 auth 中间件）替代请求体中的 `user_id`；GET/POST 消息时校验会话归属

### C5. refreshToken 存储在 localStorage

- **文件**：`frontend/src/stores/user.ts` 第 17-19、26-28 行
- **现状**：`accessToken` 和 `refreshToken` 都持久化到 localStorage
- **风险**：任何 XSS 漏洞（如恶意 markdown 图片 URL）都能直接读取 token，refreshToken 有效期 7 天，危害更大
- **修复**：
  - refreshToken 改用 `httpOnly` + `Secure` + `SameSite=Strict` cookie（服务端设置）
  - accessToken 仅保留在 Pinia 内存状态中，过期后通过 refreshToken 刷新

### C6. refreshToken 每个请求都发送

- **文件**：`frontend/src/utils/request.ts` 第 56-57 行
- **现状**：请求拦截器给每个请求都附加 `x-refresh-token` 头
- **风险**：任何服务器日志、代理日志、网络抓包都能捕获 refreshToken
- **修复**：删除请求拦截器中的 refreshToken 附加逻辑，仅在 `refreshAuthToken` 函数中发送

### C7. accessToken 放在 WebSocket URL 查询参数中

- **文件**：`frontend/src/composables/useCollabSocket.ts` 第 37 行
- **现状**：`ws://localhost:3000/ws/collab?docId=...&token=${token}`
- **风险**：URL 会被记录在服务器访问日志、浏览器历史、代理服务器日志中（OWASP 明确反对的做法）
- **修复**：方案 A：WebSocket 连接建立后通过第一条消息发送 token；方案 B：先通过 HTTP 接口获取一次性握手 token

---

## 二、HIGH — 尽快修复（18 个）

### 安全类（7 个）

### H1. 注册接口无输入校验

- **文件**：`backend/src/modules/user/controller.ts` 第 22-49 行
- **现状**：`username`、`email`、`password` 直接从 `req.body` 取值，无格式校验、无最小长度限制
- **风险**：可以注册空密码、畸形邮箱、单字符用户名
- **修复**：使用 `zod` 或 `joi` 添加校验：邮箱格式、密码最少 8 位、用户名 3-30 位字母数字

### H2. CORS 允许所有来源

- **文件**：`backend/src/app.ts` 第 21-23 行
- **现状**：`cors()` 未指定 `origin`，默认 `*`
- **风险**：任意网站可以发起跨域认证请求，读取响应头中的 token（CSRF + token 窃取）
- **修复**：设置 `origin` 为实际前端域名，开发环境可用环境变量配置

### H3. JWT_SECRET 未设置时为 undefined

- **文件**：`backend/src/modules/user/config.ts` 第 31 行
- **现状**：`secret: process.env.JWT_SECRET as string`，如果环境变量未设置，值为 `undefined`
- **风险**：`jwt.sign` 使用 undefined secret 签名，token 无加密完整性
- **修复**：启动时校验 `JWT_SECRET` 存在且非空，否则报错退出

### H4. 认证接口无限流

- **文件**：`backend/src/modules/user/controller.ts`
- **现状**：`/login`、`/register`、`/emailLogin`、`/sendEmailCode` 均无速率限制
- **风险**：可暴力破解密码、可洪水式发送验证邮件
- **修复**：对所有认证接口添加限流（比 AI 限流更严格，如 5 次/分钟/IP）

### H5. 登录表单密码框 type="text"

- **文件**：`frontend/src/views/Login.vue` 第 35 行
- **现状**：`<input type="text" v-model="password">`，密码明文显示
- **修复**：改为 `<input type="password" ...>`

### H6. 上传文件未校验 magic bytes

- **文件**：`backend/src/modules/doc/upload.ts` 第 32-38 行
- **现状**：只检查文件扩展名和客户端报告的 MIME 类型
- **风险**：攻击者可以上传伪装成 jpg 的恶意文件
- **修复**：使用 `file-type` 包校验文件真实类型（magic bytes）

### H7. 前端 URL 全部硬编码 localhost

- **文件**：`frontend/src/utils/request.ts`、`frontend/src/composables/useCollabSocket.ts`、`frontend/src/config/aiFeature.ts`
- **现状**：API 地址硬编码 `http://localhost:3000/api`，WebSocket 硬编码 `ws://localhost:3000`
- **风险**：无法部署到任何非本地环境；token 在网络上明文传输
- **修复**：使用 `import.meta.env.VITE_API_BASE_URL` 和 `import.meta.env.VITE_WS_BASE_URL`，创建 `.env.production` 文件

---

### 架构类（7 个）

### H8. YDoc 内存缓存无上限

- **文件**：`backend/src/modules/collab/ydoc.ts` 第 4 行
- **现状**：`const docs = new Map<number, Y.Doc>()`，YDoc 实例永不清理
- **风险**：每个 Y.Doc 持有完整文档内容，随文档数量增长内存无限膨胀
- **修复**：实现 LRU 缓存，设置最大容量；无活跃 WebSocket 连接的 YDoc 超时后自动清理

### H9. YDoc 缓存竞态条件

- **文件**：`backend/src/modules/collab/ydoc.ts` 第 6-32 行
- **现状**：`getServerYDoc` 是 async 但非原子操作。两个客户端同时连接同一文档时，都会看到缓存为空，都会从数据库加载，第二个覆盖第一个，丢失已应用的更新
- **修复**：使用 pending-promise 缓存模式：
  ```typescript
  const pendingDocs = new Map<number, Promise<Y.Doc>>()
  ```

### H10. 无 HTTP server 优雅关闭

- **文件**：`backend/src/app.ts` 第 41-48 行
- **现状**：SIGINT/SIGTERM 处理器只调用 `flushAllSaves()`，不关闭 HTTP/WebSocket 服务器
- **风险**：在途请求被突然断开；`process.exit` 可能在 flush 完成前执行
- **修复**：
  ```typescript
  process.on("SIGINT", async () => {
    server.close()            // 停止接受新连接
    wss.close()               // 关闭 WebSocket 服务器
    await flushAllSaves()     // 刷新待保存内容
    await prisma.$disconnect()
    process.exit(0)
  })
  ```

### H11. WebSocket 无心跳机制

- **文件**：`backend/src/modules/collab/server.ts`
- **现状**：无 ping/pong 心跳。客户端断网/休眠后，死连接在 room map 中存活直到操作系统 TCP 超时（通常 2 小时以上）
- **风险**：广播消息会抛异常；room 中的用户数不准确
- **修复**：实现定期 ping 间隔，未在超时内收到 pong 则终止连接

### H12. 重复创建 PrismaClient

- **文件**：`backend/src/modules/ai/context.ts` 第 9 行
- **现状**：`const prisma = new PrismaClient()` 绕过了 `utils/prisma.ts` 的单例
- **风险**：两个 PrismaClient 各自维护连接池，数据库连接数翻倍
- **修复**：改为 `import prisma from '../../utils/prisma'`

### H13. authMiddleware 重复注册

- **文件**：`backend/src/modules/doc/upload.ts` 第 12 行和第 46 行
- **现状**：`router.use(authMiddleware)` 注册了两次
- **风险**：每个上传请求执行两次 JWT 验证，浪费性能
- **修复**：删除第 46 行的重复注册

### H14. SSE 流解析错误被静默吞掉

- **文件**：`backend/src/modules/ai/service.ts` 第 96-98 行
- **现状**：
  ```typescript
  } catch (e) {
    continue;  // 静默跳过
  }
  ```
- **风险**：AI 服务返回畸形数据时无任何诊断信息
- **修复**：至少添加 `console.warn('SSE parse error:', e)`

### H15. context 路由缺少 asyncHandler

- **文件**：`backend/src/modules/ai/context.ts` 第 17、41、53 行
- **现状**：三个路由处理器都是普通 `async (req, res) => {}`，未用 `asyncHandler` 包裹
- **风险**：未捕获的 Promise rejection 会导致进程崩溃，而不是被错误中间件处理
- **修复**：用 `asyncHandler()` 包裹所有处理器

---

### UX 类（3 个）

### H16. 登录后不跳转回原页面

- **文件**：`frontend/src/stores/user.ts` 第 39、55 行
- **现状**：路由守卫把目标页存到 `query.redirect`，但 `login()` 和 `emailLogin()` 始终 `router.push('/')`
- **修复**：
  ```typescript
  const redirect = router.currentRoute.value.query.redirect as string
  router.push(redirect || '/')
  ```

### H17. 登录/注册无 loading 状态

- **文件**：`frontend/src/views/Login.vue`
- **现状**：API 调用期间无加载指示器，用户可多次点击触发重复请求
- **修复**：添加 `loading` ref，绑定到按钮的 `:disabled` 和 `:loading`

### H18. 删除文档无确认弹窗

- **文件**：`frontend/src/component/card/documentCard.vue` 第 68-76 行
- **现状**：`deleteById` 直接删除，无任何确认
- **修复**：使用 `ElMessageBox.confirm('确定删除该文档？', '提示')` 后再调用删除 API

---

## 三、MEDIUM — 计划修复（22 个）

### 安全 & 基础设施（7 个）

| # | 问题 | 位置 | 修复方案 |
|---|------|------|---------|
| M1 | 验证码用 `Math.random()` 生成 | `backend/src/modules/user/service.ts:124-126` | 改用 `crypto.randomInt(100000, 999999)` |
| M2 | 上传 URL 硬编码 localhost | `backend/src/modules/doc/upload.ts:54` | 从 `req.protocol + '://' + req.get('host')` 或环境变量获取 |
| M3 | WebSocket 无消息大小限制 | `backend/src/modules/collab/server.ts` | 设置 `maxPayload: 1024 * 1024`（1MB） |
| M4 | 无 Helmet 安全头中间件 | `backend/src/app.ts` | 添加 `app.use(helmet())` |
| M5 | 无请求日志中间件 | `backend/src/app.ts` | 添加 `morgan` 或 `pino` |
| M6 | 无 `/health` 健康检查端点 | `backend/src/app.ts` | 添加 `app.get('/health', ...)` |
| M7 | Redis 连接无 error 事件处理 | `backend/src/modules/user/config.ts` | 添加 `redis.on('error', (err) => console.error('Redis error:', err))` |

### 数据库（4 个）

| # | 问题 | 位置 | 修复方案 |
|---|------|------|---------|
| M8 | 邀请接受存在 TOCTOU 竞态 | `backend/src/modules/doc/service.ts:282-353` | 将校验逻辑移入事务内部，或使用 `SELECT ... FOR UPDATE` |
| M9 | 文档搜索用 `contains`（全表扫描） | `backend/src/modules/doc/service.ts:168-193` | 添加 MySQL 全文索引，使用 Prisma 的 `search` 过滤器 |
| M10 | DocumentRevision 表定义但未使用 | `backend/prisma/schema.prisma:109-121` | 要么实现快照策略，要么删除表定义 |
| M11 | `relationMode = "prisma"` 禁用数据库外键 | `backend/prisma/schema.prisma:8` | 如使用标准 MySQL，移除此配置以启用数据库级外键约束 |

### 代码质量（8 个）

| # | 问题 | 位置 | 修复方案 |
|---|------|------|---------|
| M12 | 函数名拼写错误 `comparePasseword` | `backend/src/utils/bcrypt.ts:23` | 重命名为 `comparePassword`，更新所有导入 |
| M13 | `verifyAccessToken` 有两个重复实现 | `backend/src/modules/user/auth.ts` 和 `service.ts` | 统一为一个，删除另一个 |
| M14 | Element Plus 全量引入（~800KB） | `frontend/src/main.ts:8-10` | 使用 `unplugin-element-plus` 按需引入 |
| M15 | documentCard N+1 查询用户名 | `frontend/src/component/card/documentCard.vue:79-86` | 后端在文档列表接口中 JOIN 返回用户名，或前端批量查询 |
| M16 | Yjs 更新用 JSON 数组传输（膨胀 4 倍） | `frontend/src/composables/useCollabSocket.ts:129` | 改用 base64 编码或 WebSocket 二进制帧 |
| M17 | 多处使用 `alert()` 而非 `ElMessage` | `frontend/src/views/EditorPage.vue`、`MyMdEditor.vue` | 全部替换为 `ElMessage.warning/error` |
| M18 | 登录/注册表单不支持回车提交 | `frontend/src/views/Login.vue` | 按钮改为 `type="submit"` + 表单 `@submit.prevent`，或输入框添加 `@keydown.enter` |
| M19 | AI Modal 无 Escape 键关闭、无焦点陷阱 | `frontend/src/component/ai/AiModel.vue` | 添加 `@keydown.esc`，或改用 Element Plus 的 `ElDialog` |

### 状态管理（3 个）

| # | 问题 | 位置 | 修复方案 |
|---|------|------|---------|
| M20 | token 管理有两个源头 | `stores/user.ts` + `utils/request.ts` | 统一由 Pinia store 管理所有 token 操作，request 拦截器调用 store 方法 |
| M21 | `clearAuthAndRedirect` 不更新 Pinia store | `frontend/src/utils/request.ts:23-29` | 清除 localStorage 后同时调用 store 的 `$reset()` |
| M22 | `JSON.parse(store 初始化)` 未 try/catch | `frontend/src/stores/user.ts:20` | 包裹 try/catch，解析失败时 fallback 为 null |

---

## 四、LOW — 有空再改（8 个）

| # | 问题 | 位置 | 修复方案 |
|---|------|------|---------|
| L1 | 组件文件名不符合 Vue PascalCase 规范 | 多个组件文件 | 重命名为 `DocumentCard.vue`、`AdminPage.vue` 等 |
| L2 | `component/` 文件夹应为 `components/`（复数） | `frontend/src/component/` | 重命名文件夹 |
| L3 | 死代码和未使用的类型定义 | `backend/src/modules/user/type.ts`、`frontend/src/type/collab.ts` | 删除未使用的类型 |
| L4 | 登录页倒计时 timer 未在组件卸载时清理 | `frontend/src/views/Login.vue:89,112-118` | 添加 `onBeforeUnmount(() => clearInterval(timer))` |
| L5 | `replaceSelection` 用字符串 replace（可能替换错位置） | `frontend/src/component/editor/MyMdEditor.vue:74` | 改用 CodeMirror transaction API 按选区范围替换 |
| L6 | 无 404 页面 | `frontend/src/router/index.ts` | 添加 `/:pathMatch(.*)*` 路由 |
| L7 | 编辑器头部无响应式布局 | `frontend/src/views/EditorPage.vue` | 添加小屏媒体查询，折叠按钮 |
| L8 | 多处命名不一致 | 后端多处 | `getPCByUserId` → `getPrivateDocuments`、`getOPByUserId` → `getSharedDocuments` 等 |

---

## 五、前端 WebSocket / 实时协同专项（5 个）

| # | 严重度 | 问题 | 位置 | 修复方案 |
|---|--------|------|------|---------|
| WS1 | HIGH | 重连无上限，服务器永久挂掉会无限重试 | `useCollabSocket.ts:148-158` | 添加最大重试次数（如 10 次），超限后显示"连接断开"并提供手动重连按钮 |
| WS2 | HIGH | 重连时 `window.location.reload()` | `EditorPage.vue:124-126` | 改为重新请求 `y-sync` 全量状态，不要刷新页面 |
| WS3 | HIGH | Y.Doc 重连后不重建，可能导致内容冲突 | `useYjsMarkdown.ts` | 暴露 `reset()` 方法：销毁旧 doc → 创建新 doc → 应用远程同步 |
| WS4 | MEDIUM | Awareness 状态断开时未清理 | `useYjsMarkdown.ts` | 在 `destroy()` 中先调用 `awareness.destroy()` 再销毁 ydoc |
| WS5 | MEDIUM | `connect()` 可能与进行中的重连定时器冲突 | `useCollabSocket.ts` | 在 `connect()` 开头先关闭已有 WebSocket |

---

## 六、建议修复顺序

```
第一阶段：安全加固（1-2 天）
├── C1  删除硬编码邮箱密码
├── C2  删除 service.ts 中的 token 日志
├── C3  删除 middleware.ts 中的 token 日志
├── C4  AI context 接口加鉴权
├── C5  refreshToken 改用 httpOnly cookie
├── C6  refreshToken 仅在刷新时发送
├── C7  WebSocket token 改用握手消息
├── H1  注册接口加输入校验
├── H2  CORS 收紧 origin
├── H3  JWT_SECRET 启动校验
├── H4  认证接口加限流
└── H5  登录密码框改为 type="password"

第二阶段：稳定性修复（3-5 天）
├── H8  YDoc 内存缓存 LRU 化
├── H9  YDoc 缓存竞态修复
├── H10 HTTP 优雅关闭
├── H11 WebSocket 心跳机制
├── H12 删除重复 PrismaClient
├── H13 删除重复 authMiddleware
├── H14 SSE 解析错误日志
├── H15 context 路由 asyncHandler
├── H18 删除文档加确认弹窗
├── WS1 重连上限
├── WS2 重连不要 reload
└── WS3 Y.Doc 重建机制

第三阶段：体验 & 质量优化（1-2 周）
├── H7  前端 URL 环境变量化
├── H16 登录后跳转回原页面
├── H17 登录 loading 状态
├── M4  Helmet 安全头
├── M5  请求日志
├── M14 Element Plus 按需引入
├── M15 N+1 查询修复
├── M16 Yjs 二进制传输
├── M20 token 管理统一
├── M22 store 初始化 try/catch
└── L1-L8 各种命名和小问题
```

---

## 七、附录：问题分布统计

| 严重度 | 后端 | 前端 | 合计 |
|--------|------|------|------|
| CRITICAL | 4 | 3 | **7** |
| HIGH | 11 | 7 | **18** |
| MEDIUM | 14 | 8 | **22** |
| LOW | 5 | 3 | **8** |
| **合计** | **34** | **21** | **55** |

> 注：部分问题（如 token 存储、URL 硬编码）同时涉及前后端，上表按主要归属分类。WebSocket/协同专项的 5 个问题单独列出。
