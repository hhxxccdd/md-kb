export interface ApiResponse {
    code: number,
    data?: unknown,
    msg?: string
}

export const ApiCode = {
  // 0: 请求成功
  Success: 0,

  // 1xxxx: 通用请求类错误
  InvalidParams: 10001,

  // 2xxxx: 用户模块错误
  UserNotFound: 20001,
  UsernameExists: 20002,
  EmailExists: 20003,
  PasswordIncorrect: 20004,

  // 3xxxx: 认证与授权错误
  Unauthorized: 30000,
  AccessTokenInvalid: 30001,
  AccessTokenExpired: 30002,
  RefreshTokenInvalid: 30003,
  RefreshTokenExpired: 30004,
  LoginExpired: 30005,
  Forbidden: 30006,

  // 9xxxx: 系统级错误
  InternalError: 90000,
  DatabaseError: 90001,
} as const
