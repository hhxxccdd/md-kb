// 通用 API 响应类型
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg: string;
}