# MD-KB — AI 增强的协同 Markdown 知识库

一个全栈 Web 应用，支持 Markdown 文档编辑、多人实时协同、AI 智能问答，基于 Vue 3 + Express + Prisma + Yjs 构建。

---

## 功能特性

### 📝 Markdown 编辑
- 基于 md-editor-v3 的富文本编辑器，支持 Mermaid 图表、KaTeX 数学公式、Emoji、PDF 导出
- 图片上传（拖拽 / 粘贴，自动按日期归档，5MB 限制）
- 非协作文档自动保存（800ms 防抖）

### 👥 多人实时协同编辑
- 基于 Yjs CRDT 实现冲突无关的并发编辑
- WebSocket 实时同步，增量更新广播
- Presence 在线状态展示，实时显示协作者列表
- 防抖持久化（2s 延迟写 DB），最后用户离开时立即 flush
- 优雅关闭：服务端 SIGINT/SIGTERM 时自动保存所有文档

### 🤖 AI 智能助手（通义千问）
- **AI 润色**：选中文本一键润色，保留 Markdown 格式
- **AI 翻译**：选中文本翻译到指定语言
- **文档问答**：基于文档内容的多轮对话，支持上下文记忆（最近 10 条）
- SSE 流式响应，逐字渲染
- IP 级限流（10 次/分钟），聊天记录持久化

### 🔐 认证与安全
- 双 Token 无感刷新：accessToken（2h）+ refreshToken（7d）+ 轮换机制
- 前后端并发刷新 Promise 去重，避免重复请求
- 登录方式：用户名密码 + 邮箱验证码（Redis 存储，5 分钟过期）
- bcrypt 密码哈希，JWT 签名验证

### 📄 文档管理
- 私有文档 / 共享文档分类管理
- 软删除，文档搜索
- 邀请协作：生成邀请链接（UUID token，7 天有效期），一键加入协作

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API + `<script setup>`) + TypeScript |
| 构建工具 | Vite 7 |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia 3 |
| Markdown 编辑器 | md-editor-v3 + @vavt/v3-extension |
| 实时协同 | Yjs (CRDT) + y-codemirror.next + y-protocols |
| 后端框架 | Express 5 + TypeScript |
| ORM | Prisma 5 + MySQL |
| 缓存 | Redis (ioredis)，用于邮箱验证码 |
| 认证 | JWT (jsonwebtoken) + bcryptjs |
| 实时通信 | ws (WebSocket) + Yjs |
| AI 接口 | 通义千问 (SSE 流式) |
| 邮件服务 | Nodemailer (QQ SMTP) |

---

## 项目结构

```
md-kb/
├── backend/                        # 后端服务
│   ├── prisma/
│   │   ├── schema.prisma           # 数据库模型定义（8 张表）
│   │   └── migrations/             # 数据库迁移文件
│   └── src/
│       ├── app.ts                  # Express 入口，挂载路由 + WebSocket
│       ├── middleware/
│       │   ├── errorMiddleware.ts  # 全局错误处理
│       │   └── rateLimit.ts        # AI 接口限流
│       ├── utils/
│       │   ├── response.ts         # 统一响应格式
│       │   ├── throwError.ts       # 分类错误抛出（Business / Auth / AI）
│       │   ├── bcrypt.ts           # 密码哈希工具
│       │   ├── prisma.ts           # Prisma 单例
│       │   └── asyncHandler.ts     # 异步路由包装
│       └── modules/
│           ├── user/               # 用户模块：注册、登录、Token 刷新、邮箱验证
│           ├── doc/                # 文档模块：CRUD、搜索、分享、邀请、图片上传
│           ├── ai/                 # AI 模块：润色、翻译、文档问答、SSE 流式
│           └── collab/             # 协同模块：WebSocket 服务、房间管理、Yjs 持久化
│
└── frontend/                       # 前端应用
    └── src/
        ├── main.ts                 # 应用入口
        ├── router/                 # 路由配置
        ├── stores/                 # Pinia 状态管理
        ├── api/                    # 接口封装（user / doc / chat / aiContext）
        ├── utils/
        │   ├── request.ts          # Axios 实例 + 拦截器（Token 刷新、错误处理）
        │   └── aiStream.ts         # SSE 流式读取
        ├── composables/
        │   ├── useCollabSocket.ts  # WebSocket 连接管理
        │   └── useYjsMarkdown.ts   # Yjs CRDT 协同编辑
        ├── component/
        │   ├── editor/MyMdEditor.vue   # Markdown 编辑器封装
        │   ├── ai/AiModel.vue          # AI 功能弹窗
        │   └── card/documentCard.vue   # 文档卡片
        └── views/
            ├── Login.vue           # 登录 / 注册
            ├── adminPage.vue       # 文档管理仪表盘
            ├── EditorPage.vue      # 编辑器页面（协同 + AI）
            └── InvitePage.vue      # 邀请接受页
```

---

## 数据库设计

8 张表，覆盖用户、文档、协作、AI 问答全链路：

```
User                    用户信息 + refreshToken
Document                文档内容 + 版本 + 软删除
DocumentCollaborator    文档协作关系（多对多）
DocumentInvite          邀请链接（token + 状态机）
DocumentRevision        文档历史版本
ChatSession             AI 问答会话（用户 × 文档 唯一）
ChatMessage             AI 聊天消息
```

---

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL >= 5.7
- Redis >= 6.0

### 1. 克隆项目

```bash
git clone https://github.com/your-username/md-kb.git
cd md-kb
```

### 2. 配置环境变量

复制并编辑后端环境变量：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入以下配置：

```env
# 数据库
DATABASE_URL="mysql://用户名:密码@localhost:3306/md_kb"

# JWT 密钥（建议用随机字符串）
JWT_SECRET="your-random-secret-key"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# 邮箱（QQ SMTP，用于发送验证码）
EMAIL_USER="your-email@qq.com"
EMAIL_PASS="your-smtp-authorization-code"

# 通义千问 API
API_URL="https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
TONGYI_API_KEY="your-api-key"
TONGYI_MODEL_NAME="qwen-turbo"
TONGYI_API_TIMEOUT="30000"
```

### 3. 初始化数据库

```bash
cd backend
npx prisma migrate dev
```

### 4. 启动后端

```bash
cd backend
npm install
npm run dev
# 服务运行在 http://localhost:3000
```

### 5. 启动前端

```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:5173
```

### 6. 访问应用

浏览器打开 `http://localhost:5173`，注册账号即可使用。

---

## API 概览

### 用户认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/register` | 用户注册 |
| POST | `/api/user/login` | 密码登录 |
| POST | `/api/user/sendEmailCode` | 发送邮箱验证码 |
| POST | `/api/user/emailLogin` | 邮箱验证码登录 |
| POST | `/api/user/refreshToken` | 刷新 Token 对 |

### 文档管理（需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/doc/createByUserId` | 创建文档 |
| GET | `/api/doc/getPCByUserId` | 获取私有文档列表 |
| GET | `/api/doc/getOPByUserId` | 获取共享文档列表 |
| POST | `/api/doc/search` | 搜索文档 |
| GET | `/api/doc/:id` | 获取文档详情 |
| POST | `/api/doc/:id` | 更新文档 |
| DELETE | `/api/doc/:id` | 删除文档（软删除） |
| POST | `/api/doc/share/:id` | 设置文档共享 |
| POST | `/api/doc/invite/:id` | 创建邀请链接 |
| POST | `/api/doc/invite/:token/accept` | 接受邀请 |

### AI 功能（需认证 + 限流）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/polish` | AI 润色（SSE 流式） |
| POST | `/api/ai/translate` | AI 翻译（SSE 流式） |
| POST | `/api/ai/answer-doc` | 文档问答（SSE 流式） |
| GET | `/api/ai/context/:session_id` | 获取聊天历史 |

### WebSocket

```
ws://localhost:3000/ws/collab?docId=<文档ID>&token=<accessToken>
```

---

## 核心架构设计

### 双 Token 认证流程

```
登录 → 签发 accessToken(2h) + refreshToken(7d)
  ↓
请求 API → 携带 accessToken
  ↓
accessToken 过期 → 用 refreshToken 换新 Token 对
  ↓
refreshToken 轮换 → 旧 token 失效，签发新的 Token 对
```

前后端均使用 Promise 去重，避免并发刷新。

### 实时协同编辑流程

```
用户 A 编辑 → Yjs 生成增量更新 → WebSocket 发送到服务端
  ↓
服务端应用更新到 Y.Doc → 广播给房间内其他用户
  ↓
用户 B 收到增量更新 → 应用到本地 Y.Doc → 界面自动更新
  ↓
2s 无新编辑 → 防抖触发 → Y.Doc 内容持久化到 MySQL
```

### AI 流式响应流程

```
用户选中文本 → 发送请求到后端
  ↓
后端构造 Prompt → 调用通义千问 API（SSE 流式）
  ↓
逐 chunk 返回 → 通过 SSE 推送到前端
  ↓
前端逐字渲染到编辑器 / 对话框
```

---

## 许可证

MIT License
