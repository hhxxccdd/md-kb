export interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg: string;
}

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
