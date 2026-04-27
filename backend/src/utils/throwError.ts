// utils/throwError.ts
import { AppError } from './types/error';
import { ApiCode } from './types/response';

export const throwBusinessError = (
  message: string,
  statusCode = 400,
  code: number = ApiCode.InvalidParams
) => {
  const err = new Error(message) as AppError;
  err.errorCode = 'BUSINESS';
  err.statusCode = statusCode;
  err.code = code;
  throw err;
};

export const throwAIError = (
  message: string,
  statusCode = 500,
  code: number = ApiCode.InternalError
) => {
  const err = new Error(message) as AppError;
  err.errorCode = 'AI';
  err.statusCode = statusCode;
  err.code = code;
  throw err;
};

export const throwAuthError = (
  message: string,
  statusCode = 401,
  code: number = ApiCode.Unauthorized
) => {
  const err = new Error(message) as AppError;
  err.errorCode = 'AUTH';
  err.statusCode = statusCode;
  err.code = code;
  throw err;
};
