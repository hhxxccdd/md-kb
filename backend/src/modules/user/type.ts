//用户注册
export interface registerUser {
  username: string
  email: string
  password: string
}

// 方式 A：账号密码登录
interface AccountLogin {
  username: string;
  password: string;
  email?: never;      // 明确禁止传 email
  verifycode?: never; // 明确禁止传 verifycode
}

// 方式 B：邮箱验证码登录
interface EmailLogin {
  username?: never;   // 明确禁止传 username
  password?: never;   // 明确禁止传 password
  email: string;
  verifycode: string;
}

// 最终导出：两者选一
export type LoginUser = AccountLogin | EmailLogin;

//Token返回结构
export interface TokenVo {
  accessToken: string
  refreshToken: string
  expires: number
}

export interface userInfoVo {
  id: string
  username: string
}

//登录接口整体返回结构
export interface loginResultVo {
  token: TokenVo
  user: userInfoVo
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface RefreshTokenPayload {
  userId: number
  type: 'refresh'
}

export interface AccessTokenPayload {
  userId: number
  type: 'access'
}

// 发送验证码请求体
export interface SendEmailCodeDto {
  email: string;
}

// 邮箱登录请求体
export interface EmailLoginDto {
  email: string;
  code: string;
}

