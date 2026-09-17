# CollabMD — 多人协同 Markdown 编辑器

![image-20260917101436803](README/image-20260917101436803.png)

![image-20260917101638666](README/image-20260917101638666.png)

CollabMD 是一个面向个人写作和小型协作场景的在线 Markdown 编辑器，提供文档管理、多人实时协同、AI 润色翻译和 Markdown 全文质量检查。

项目使用 Vue 3 与 TypeScript 构建前端，Express 与 Prisma 提供后端服务，并通过 Yjs 和 WebSocket 实现多人协同编辑。AI 生成结果不会直接修改正文，而是先以 Inline Diff 的形式展示，由用户确认后再采纳。

> 项目定位是“带有 AI 写作辅助能力的协同 Markdown 编辑器”，不是通用 AI 知识库，也不包含 RAG 或文档智能问答。AI 只处理用户主动选择的文本和全文质量检查，不负责自动生成或管理知识。

## 功能特性

### 📝 Markdown 编辑

- 基于 `md-editor-v3` 提供 Markdown 编辑与实时预览
- 支持 Mermaid 流程图、KaTeX 数学公式和 Emoji
- 支持拖拽或粘贴上传 JPG、PNG、GIF、WEBP 图片
- 单张图片限制为 5 MB，并按日期目录保存
- 支持导出 Markdown 文件和 PDF
- 私有文档使用防抖策略自动保存
- 页面刷新后可以恢复最近保存的文档内容

### 👥 多人实时协同编辑

- 使用 Yjs CRDT 合并不同用户产生的并发修改
- 通过 WebSocket 在文档房间内同步增量更新
- 使用 `y-codemirror.next` 连接 Yjs 文档和 CodeMirror 编辑器
- 实时展示当前文档中的在线协作者
- 网络异常断开后自动尝试重新连接
- 服务端对协同内容进行防抖持久化
- 最后一名用户离开房间或服务关闭时执行最终保存

### 🤖 AI 智能辅助

#### 选区润色与翻译

- 选中文本后自动显示 AI 操作入口
- 支持中文润色和多语言翻译
- 通过 SSE 流式接收并展示生成内容
- 支持取消生成、失败重试、忽略和采纳
- 使用 CodeMirror Decoration 展示 Inline Diff
- 原文与 AI 候选稿分离，候选内容不会直接写入正文
- 采纳前校验选区范围和原文，避免覆盖已经变化的内容
- 协同场景下，只有采纳后的正文修改会通过 Yjs 同步

#### Markdown 全文质量检查

- 使用 remark AST 与 lint 规则检查 Markdown 结构
- 检查标题等级跳跃、多个一级标题、空链接和未定义引用等问题
- 使用 AI 补充检查结构、清晰度、术语一致性和内容重复问题
- 统一展示问题级别、问题说明、修改建议和原文片段
- 点击检查结果可以定位到编辑器中的对应行
- AI 检查失败时仍保留本地规则检查结果

### 🔐 认证与安全

- 支持用户名密码注册和登录
- 支持邮箱验证码登录，验证码保存于 Redis
- 使用 bcrypt 对密码进行哈希存储
- 使用 accessToken 与 refreshToken 双 Token 认证
- accessToken 有效期为 2 小时，refreshToken 有效期为 7 天
- refreshToken 刷新后进行轮换，降低旧 Token 被重复使用的风险
- 前端对并发刷新请求进行 Promise 去重
- Axios 拦截器负责自动刷新 Token 并重放原请求
- Vue Router 路由守卫保护文档与邀请页面
- AI 接口使用限流中间件控制调用频率

### 📄 文档管理

- 创建、查看、搜索和软删除文档
- 区分私有文档与协作文档
- 文档列表按最近更新时间排序
- 仅文档所有者可以删除文档和创建邀请
- 邀请链接使用 UUID Token，并设置 7 天有效期
- 登录用户可以通过邀请链接加入文档协作
- 服务端统一校验文档访问权限和编辑权限

## 技术栈

| 层级 | 技术 | 用途 |
| --- | --- | --- |
| 前端框架 | Vue 3、TypeScript | 页面开发与类型约束 |
| 构建工具 | Vite 7 | 本地开发与生产构建 |
| 状态与路由 | Pinia、Vue Router | 登录状态与页面导航 |
| UI 组件 | Element Plus、Lucide Vue | 页面组件与图标 |
| Markdown 编辑器 | md-editor-v3 | Markdown 编辑、预览与导出 |
| 编辑器扩展 | CodeMirror 6 | 选区、Decoration 与文本定位 |
| Markdown 分析 | remark、remark-gfm、remark-lint | AST 解析与结构规则检查 |
| 实时协同 | Yjs、y-codemirror.next、y-protocols | CRDT 文档同步 |
| 后端框架 | Express 5、TypeScript | REST API 与服务端逻辑 |
| 数据访问 | Prisma 5、MySQL | 数据模型、查询与事务 |
| 缓存 | Redis | 邮箱验证码缓存 |
| 实时通信 | ws | WebSocket 协同服务 |
| 身份认证 | JWT、bcryptjs | Token 鉴权与密码保护 |
| AI 服务 | 通义千问 | 润色、翻译与语义检查 |
| 邮件服务 | Nodemailer、QQ SMTP | 邮箱验证码发送 |

## 项目结构

前端使用 feature-first 目录结构，将同一功能的组件、接口、组合式函数和类型集中管理；后端按照业务模块组织路由和服务。

```text
md-kb/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Prisma 数据模型
│   │   └── migrations/                # 数据库迁移记录
│   └── src/
│       ├── app.ts                     # Express 与 WebSocket 入口
│       ├── middleware/                # 全局错误处理、AI 限流
│       ├── modules/
│       │   ├── user/                  # 注册、登录、Token、邮箱验证
│       │   ├── doc/                   # 文档、邀请和图片上传
│       │   ├── ai/                    # 润色、翻译和质量检查
│       │   └── collab/                # Yjs 房间、同步与持久化
│       └── utils/                     # Prisma、响应和错误工具
│
└── frontend/
    └── src/
        ├── app/router/                 # 路由配置与登录守卫
        ├── pages/                      # 登录、文档、编辑器和邀请页面
        ├── features/
        │   ├── ai/                     # AI 请求、选区提示和 Inline Diff
        │   ├── auth/                   # 用户接口、状态和类型
        │   ├── collaboration/          # WebSocket 与 Yjs 协同逻辑
        │   ├── documents/              # 文档接口、搜索、草稿和导出
        │   ├── editor/                 # 编辑器及页面状态组件
        │   └── quality/                # 规则检查、AI 检查和结果抽屉
        ├── shared/                     # Axios 实例与通用类型
        ├── App.vue
        └── main.ts
```

## 数据库设计

当前核心功能主要使用以下数据模型：

| 模型 | 作用 |
| --- | --- |
| `User` | 保存用户、密码哈希、头像和 refreshToken |
| `Document` | 保存文档标题、Markdown 正文、版本和分享状态 |
| `DocumentCollaborator` | 维护用户与协作文档之间的多对多关系 |
| `DocumentInvite` | 保存邀请 Token、状态、发起人和过期时间 |

主要关系如下：

```text
User 1 ── N Document
User N ── N Document（通过 DocumentCollaborator）
Document 1 ── N DocumentInvite
```

`DocumentCollaborator` 对 `(document_id, user_id)` 设置唯一约束，避免同一用户重复加入文档；`DocumentInvite.token` 设置唯一约束，用于安全识别邀请链接。

## 快速开始

### 环境要求

- Node.js 20+
- MySQL 5.7+
- Redis 6+
- 通义千问 API Key
- QQ 邮箱 SMTP 授权码（使用邮箱登录时需要）

### 1. 克隆项目

```bash
git clone git@github.com:hhxxccdd/md-kb.git
cd md-kb
```

### 2. 配置环境变量

复制后端环境变量模板：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`：

```env
# MySQL
DATABASE_URL="mysql://root:password@localhost:3306/md_kb"

# JWT
JWT_SECRET="your-random-secret-key"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# QQ SMTP
EMAIL_USER="your-email@qq.com"
EMAIL_PASS="your-smtp-authorization-code"

# 通义千问
API_URL="https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
TONGYI_API_KEY="your-api-key"
TONGYI_MODEL_NAME="qwen-turbo"
TONGYI_API_TIMEOUT="30000"
```

### 3. 初始化数据库

```bash
cd backend
npm install
npx prisma migrate dev
```

### 4. 启动后端

```bash
cd backend
npm run dev
```

后端默认运行在 `http://localhost:3000`。

### 5. 启动前端

新建一个终端：

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`。

### 6. 访问应用

打开浏览器访问：

```text
http://localhost:5173
```

首次使用时注册账号，然后即可创建和编辑文档。测试多人协同时，建议准备两个账号，分别使用普通窗口和无痕窗口登录。

## API 概览

### 用户认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/user/register` | 注册用户 |
| POST | `/api/user/login` | 用户名密码登录 |
| POST | `/api/user/sendEmailCode` | 发送邮箱验证码 |
| POST | `/api/user/emailLogin` | 邮箱验证码登录 |
| POST | `/api/user/refreshToken` | 刷新并轮换 Token |
| GET | `/api/user/getUserById/:id` | 获取用户名称 |

### 文档管理（需认证）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/doc/createByUserId` | 创建文档 |
| GET | `/api/doc/getPCByUserId` | 获取私有文档 |
| GET | `/api/doc/getOPByUserId` | 获取协作文档 |
| POST | `/api/doc/search?keyWord=...` | 搜索当前用户的文档 |
| GET | `/api/doc/:id` | 获取文档详情 |
| POST | `/api/doc/:id` | 更新文档 |
| DELETE | `/api/doc/:id` | 软删除文档 |
| POST | `/api/doc/share/:id` | 将文档设为协作文档 |
| POST | `/api/doc/invite/:id` | 生成协作邀请 |
| GET | `/api/doc/invite/:token` | 获取邀请信息 |
| POST | `/api/doc/invite/:token/accept` | 接受邀请 |
| POST | `/api/upload/image` | 上传文档图片 |

### AI 功能（需认证、限流）

| 方法 | 路径 | 响应方式 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/ai/polish` | SSE | 润色选中文本 |
| POST | `/api/ai/translate` | SSE | 翻译选中文本 |
| POST | `/api/ai/markdown-quality` | JSON | 检查全文语义质量 |

### WebSocket

协同编辑连接地址：

```text
ws://localhost:3000/ws/collab?docId=<文档ID>&token=<accessToken>
```

连接建立后，客户端和服务端通过以下消息完成协同：

| 消息类型 | 作用 |
| --- | --- |
| `connected` | 确认用户成功加入文档房间 |
| `presence` | 同步当前在线用户列表 |
| `y-sync` | 下发当前文档的完整 Yjs 状态 |
| `y-update` | 广播编辑器产生的增量更新 |
| `saved` | 通知客户端文档已持久化 |
| `ping` / `pong` | 检查连接状态 |

## 核心架构设计

### 双 Token 认证流程

```text
登录成功
  → 后端签发 accessToken 和 refreshToken
  → 前端请求携带 accessToken
  → accessToken 过期，接口返回未授权状态
  → Axios 拦截器使用 refreshToken 获取新 Token
  → 更新本地 Token 并重新发送原请求
```

当多个请求同时发现 Token 过期时，前端复用同一个刷新 Promise，避免重复刷新。后端在刷新成功后签发新的 refreshToken，使旧 Token 失效。

### 实时协同编辑流程

```text
用户编辑 Markdown
  → CodeMirror 产生文档变更
  → Yjs 将变更转换为增量更新
  → WebSocket 将更新发送给服务端
  → 服务端应用更新并广播给同房间用户
  → 其他客户端将更新应用到本地 Y.Doc
  → 服务端防抖写入 MySQL
```

每个协同文档对应一个服务端 Y.Doc。服务端只传输 Yjs 增量更新，不需要用“最后写入覆盖”解决并发冲突。

### AI 流式响应流程

```text
用户选中文本并选择 AI 操作
  → 前端记录选区范围和原文
  → 后端构造提示词并请求通义千问
  → AI 数据通过 SSE 逐段返回
  → 前端拼接结果并更新 Inline Diff
  → 用户采纳或忽略候选稿
```

采纳时会重新读取编辑器中的选区和原文。只有位置与内容仍然匹配，才会执行正文替换。

### Markdown 全文质量检查流程

```text
读取当前 Markdown 全文
  → remark 执行本地结构规则
  → 后端请求 AI 语义检查
  → 校验并规范化 AI JSON 结果
  → 合并两类问题
  → 在质量检查抽屉中展示并支持定位
```

规则检查与 AI 检查使用独立状态。即使 AI 请求失败，确定性的 Markdown 规则问题仍然可以正常显示。

## 许可证

当前项目主要用于个人学习、技术实践与作品展示，仓库暂未添加独立的开源许可证文件。
