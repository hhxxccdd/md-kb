// 通用 API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  msg: string;
}