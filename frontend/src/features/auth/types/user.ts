export interface AuthCredentials {
  username: string;
  password: string;
  email?: string;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  avatar: string;
}

export interface AuthResult {
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
}

export interface EmailLoginDto {
  email: string;
  code: string;
}
