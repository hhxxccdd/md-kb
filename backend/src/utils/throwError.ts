// utils/throwError.ts
import { AppError } from './types/error';

export const throwBusinessError = (message: string, statusCode = 400) => {
  const err = new Error(message) as AppError;
  err.errorCode = 'BUSINESS';
  err.statusCode = statusCode;
  throw err;
};

export const throwAIError = (message: string, statusCode = 400) => {
  const err = new Error(message) as AppError;
  err.errorCode = 'AI';
  err.statusCode = statusCode;
  throw err;
};

export const throwAuthError = (message: string, statusCode = 401) => {
  const err = new Error(message) as AppError;
  err.errorCode = 'AUTH';
  err.statusCode = statusCode;
  throw err;
};