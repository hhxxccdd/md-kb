// utils/types/error.ts
export interface AppError extends Error {
  errorCode: 'BUSINESS' | 'AI' | 'AUTH';  // 错误类型标签
  statusCode: number;
}