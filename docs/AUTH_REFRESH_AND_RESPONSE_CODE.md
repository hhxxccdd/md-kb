# 认证刷新与响应码设计说明

## 1. 文档目的

这份文档用于说明本项目在认证体系中的两项关键设计：

1. 双 Token 刷新机制
2. HTTP 状态码与 `res.code` 的分层设计

同时也记录这次对“请求并发刷新”和“响应码规范”的调整原因，便于后续维护。

---

## 2. 当前设计概览

项目当前采用的是典型的双 Token 认证方案：

- `accessToken`：短期访问凭证，用于访问受保护接口
- `refreshToken`：长期刷新凭证，用于在 `accessToken` 过期后换取新的双 Token

同时，错误返回采用两层结构：

- HTTP 状态码：表示协议层结果，例如 `200`、`401`、`403`、`500`
- `res.code`：表示业务层结果，例如 `30002` 表示 `accessToken` 已过期

这样可以同时兼顾：

- HTTP 协议语义正确
- 前端业务逻辑可精细分流

---

## 3. 为什么要区分 HTTP 状态码 和 `res.code`

### 3.1 HTTP 状态码的职责

HTTP 状态码用于表达“这次请求整体是成功还是失败”，主要给这些地方使用：

- 浏览器
- axios/fetch
- 网关和代理
- 监控与日志系统

例如：

- `200`：请求成功
- `400`：参数错误
- `401`：未认证或认证失效
- `403`：无权限
- `500`：服务端异常

### 3.2 `res.code` 的职责

`res.code` 是项目内部的业务码，用于在同一个 HTTP 状态码下区分具体业务原因。

例如同样都是 `401`，可能有这些不同情况：

- `30001`：`AccessTokenInvalid`
- `30002`：`AccessTokenExpired`
- `30003`：`RefreshTokenInvalid`
- `30004`：`RefreshTokenExpired`
- `30005`：`LoginExpired`

### 3.3 为什么不能把认证失败改成 `201`

之前如果把认证失败返回成 `201`，虽然前端可以在成功分支里继续看 `res.code`，但会带来几个问题：

- HTTP 语义错误，`201` 代表资源创建成功
- axios 的 `401` 错误拦截失效
- 网关、日志、调试时会把失败请求误判为成功
- 认证与刷新逻辑会越来越混乱

因此当前方案改为：

- 认证失败返回真实 `401`
- 前端在错误拦截器里同时看 `status` 和 `code`

---

## 4. 当前 `ApiCode` 设计

后端和前端保持同一套业务码定义。

### 4.1 编码规则

- `0`：成功
- `1xxxx`：通用请求类错误
- `2xxxx`：用户模块错误
- `3xxxx`：认证与授权错误
- `9xxxx`：系统级错误

### 4.2 当前使用的业务码

```ts
export const ApiCode = {
  Success: 0,

  InvalidParams: 10001,

  UserNotFound: 20001,
  UsernameExists: 20002,
  EmailExists: 20003,
  PasswordIncorrect: 20004,

  Unauthorized: 30000,
  AccessTokenInvalid: 30001,
  AccessTokenExpired: 30002,
  RefreshTokenInvalid: 30003,
  RefreshTokenExpired: 30004,
  LoginExpired: 30005,
  Forbidden: 30006,

  InternalError: 90000,
  DatabaseError: 90001,
} as const
```

### 4.3 推荐理解方式

可以把两层码理解成：

- HTTP 状态码：大类
- `res.code`：细类

例如：

```json
HTTP 401
{
  "code": 30002,
  "msg": "Access Token 已过期"
}
```

这里：

- `401` 表示认证失败
- `30002` 表示失败原因是 `accessToken` 过期

---

## 5. 双 Token 认证流程

### 5.1 登录阶段

用户登录成功后，后端会生成一对 Token：

- `accessToken`
- `refreshToken`

并将最新的 `refreshToken` 写入数据库。

这样设计的原因是：

- `accessToken` 用于日常访问接口
- `refreshToken` 用于后续刷新
- 数据库只保存“当前有效”的 `refreshToken`

### 5.2 请求阶段

前端每次请求时：

- 在 `Authorization` 头里带上 `Bearer <accessToken>`
- 同时保留本地的 `refreshToken`

后端鉴权中间件只校验 `accessToken`，不再负责自动刷新。

这意味着后端的职责变成：

- Token 有效：放行
- Token 无效/过期：返回真实 `401`

### 5.3 刷新阶段

当后端返回：

- `status === 401`
- `code === ApiCode.AccessTokenExpired`

前端会调用刷新接口：

```http
POST /user/refreshToken
```

请求体里带上本地保存的 `refreshToken`。

后端刷新逻辑会做以下校验：

1. `refreshToken` 是否是合法 JWT
2. `payload.type` 是否为 `refresh`
3. 数据库中保存的 `refreshToken` 是否与当前传入值一致

如果全部通过，就重新生成：

- 新的 `accessToken`
- 新的 `refreshToken`

并再次写回数据库。

这意味着本项目采用的是：

**刷新时轮换整对双 Token**

而不是只刷新 `accessToken`。

---

## 6. 为什么刷新时要连 `refreshToken` 一起轮换

如果 `refreshToken` 永远不变，会有明显安全风险：

- 一旦被窃取，可以长期反复刷新新 Token
- 攻击者可以持续维持登录状态

本项目当前设计为：

- 每次刷新成功，都签发新的 `refreshToken`
- 并把数据库里的旧值覆盖掉

这样旧的 `refreshToken` 就无法再次使用。

这也是下面这段校验存在的意义：

```ts
if (!user || user.refreshToken !== refreshToken) {
  throwAuthError('Refresh Token 已失效', 401, ApiCode.RefreshTokenExpired)
}
```

它可以阻止：

- 旧 `refreshToken` 重放
- 被替换后的旧 Token 继续刷新

---

## 7. 并发刷新问题是什么

### 7.1 什么时候会发生并发刷新

并发刷新最常见的场景是：

- 同一个用户同时发出多个请求
- 这些请求使用的都是同一个已过期的 `accessToken`
- 多个请求几乎同时收到 `401`
- 多个请求同时触发刷新

例如页面初始化时同时加载：

- 用户信息
- 文档列表
- 聊天记录

如果这时 `accessToken` 刚好过期，就会出现多个请求一起刷新。

### 7.2 这是不是设计缺陷

不是低级错误，而是双 Token 机制天然会遇到的竞态问题。

原因是：

- 多个请求共享同一套 Token 状态
- Token 过期通常发生在请求进行中
- 刷新本身又会改写 `refreshToken`

所以并发刷新是“需要被设计处理”的正常工程问题。

---

## 8. 当前如何处理并发刷新

当前项目分前后端两层处理。

### 8.1 前端：`refreshPromise` 单飞

前端在 axios 错误拦截器中维护一个全局 `refreshPromise`。

它的作用是：

- 第一个收到 `401` 的请求真正发起刷新
- 后续同时失败的请求不再重复发刷新接口
- 它们统一等待同一个刷新 Promise 完成

这样可以避免：

- 浏览器同一时刻发送多次 `/user/refreshToken`

### 8.2 后端：`refreshPromises` 按用户去重

后端刷新逻辑中维护了：

```ts
const refreshPromises = new Map<number, Promise<TokenPair>>()
```

Key 是用户 `userId`，Value 是“当前用户正在执行的刷新 Promise”。

逻辑是：

1. 如果当前用户没有刷新任务
   - 创建新的刷新 Promise
   - 放进 Map
   - 执行 `generateTokenPair`

2. 如果当前用户已经有刷新任务
   - 直接返回已有的 Promise

核心代码：

```ts
if (refreshPromises.has(payload.userId)) {
  return refreshPromises.get(payload.userId)!
}
```

### 8.3 为什么 `return Promise` 也能复用结果

这里返回的不是“旧值”，而是“正在执行中的异步任务”。

谁 `await` 这个 Promise，最后都会拿到同一组结果。

例如：

- 请求 A 先创建了刷新 Promise
- 请求 B 后进来时发现已有 Promise
- 请求 B 直接返回这个 Promise
- A 和 B 最终都会 `await` 到同一组新双 Token

所以复用的是：

**同一次刷新任务**

而不是“复制一份计算结果”。

---

## 9. 当前异常流转链路

项目中的异常返回链路如下：

1. 业务代码中发现异常
2. 调用 `throwBusinessError` / `throwAuthError` / `throwAIError`
3. 构造带有 `statusCode` 和业务码 `code` 的 `AppError`
4. `asyncHandler` 捕获异常并交给 Express
5. `globalErrorHandler` 统一封装 HTTP 响应

示例：

```ts
throwAuthError('Access Token 已过期', 401, ApiCode.AccessTokenExpired)
```

最终会返回：

```json
HTTP 401
{
  "code": 30002,
  "msg": "Access Token 已过期"
}
```

这也是前端能够按：

- `status`
- `code`

进行联合判断的基础。

---

## 10. 当前推荐的前后端职责划分

### 10.1 后端职责

- 负责签发 Token
- 负责校验 `accessToken`
- 负责校验 `refreshToken`
- 负责返回真实 HTTP 状态码
- 负责返回细粒度业务码

### 10.2 前端职责

- 保存本地双 Token
- 请求时携带 `accessToken`
- 收到 `401 + AccessTokenExpired` 时触发刷新
- 使用 `refreshPromise` 避免重复刷新
- 刷新成功后重试原请求
- 刷新失败后清理登录态并跳转登录页

这样职责会比较清晰：

- 后端负责“认证正确性”
- 前端负责“刷新体验与重试控制”

---

## 11. 当前方案的优点

### 11.1 响应语义更标准

- 认证失败返回真实 `401`
- 参数问题返回 `400`
- 权限问题返回 `403`

### 11.2 前端分流更清楚

通过 `status + code` 可以明确区分：

- `accessToken` 过期
- `refreshToken` 失效
- 登录状态丢失
- 参数错误

### 11.3 并发刷新更稳

前端和后端都做了去重：

- 前端避免发出重复刷新请求
- 后端避免同一用户同时重复签发多组双 Token

### 11.4 安全性更高

通过刷新轮换 `refreshToken`，降低旧 Token 被重放的风险。

---

## 12. 当前方案的边界

虽然当前方案已经比之前更合理，但仍然有这些边界需要知道：

### 12.1 后端 `refreshPromises` 只在单进程内有效

如果以后后端变成多实例部署：

- PM2 cluster
- 多个 Node 进程
- 多个容器/Pod

那么内存 `Map` 无法跨实例共享。

也就是说：

**它只能防单进程内并发，不能防分布式并发。**

### 12.2 多标签页仍可能同时触发刷新

虽然前端单页内已经有 `refreshPromise`，但如果用户开多个标签页：

- 每个标签页都有自己的 JS 运行上下文
- 每个标签页都可能各自触发刷新

这时还是需要依赖后端刷新接口本身的安全设计。

---

## 13. 后续可继续优化的方向

未来如果项目继续扩大，可以考虑：

### 13.1 为不同业务错误进一步细分码值

例如区分：

- 邮箱验证码过期
- 邮箱验证码错误
- AI 请求超时
- 文档不存在

### 13.2 刷新接口做更严格的事务化控制

可以考虑基于数据库条件更新或版本号机制，增强刷新轮换的一致性。

### 13.3 多实例场景引入分布式锁

如果后端变成多实例，可以考虑：

- Redis 锁
- 分布式 singleflight

来替代当前基于内存 `Map` 的去重方式。

---

## 14. 总结

当前项目在认证和响应设计上的核心原则是：

1. 真实使用 HTTP 状态码表达协议层结果
2. 使用 `res.code` 表达业务层细分原因
3. 使用双 Token 机制提升安全性与体验
4. 使用 Promise 去重处理并发刷新
5. 将刷新职责统一收敛到前端，将认证校验职责保留在后端

可以用一句话概括当前方案：

**后端负责认证正确性，前端负责刷新体验，业务码负责细分错误原因。**
