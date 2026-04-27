// utils/types/error.ts
export interface AppError extends Error {
  errorCode: 'BUSINESS' | 'AI' | 'AUTH';
  statusCode: number;
  code?: number;
}
