import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiResponse, ApiCode } from '../utils/types/response';
import { AppError } from '../utils/types/error';

export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let code: number = ApiCode.InternalError;
  let message = '服务器内部错误';

  if ('errorCode' in err) {
    const appErr = err as AppError;
    statusCode = appErr.statusCode;
    message = appErr.message;
    code = appErr.code ?? ApiCode.InternalError;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    code = ApiCode.DatabaseError;

    switch (err.code) {
      case 'P2025':
        message = '请求的资源不存在';
        statusCode = 404;
        break;
      case 'P2002':
        message = '数据字段重复，请检查后重试';
        break;
      default:
        message = '数据库操作异常';
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    code = ApiCode.InvalidParams;
    message = '请求参数格式不正确';
  } else {
    console.error('系统未知错误:', err);
    const isDev = process.env.NODE_ENV === 'development';
    message = isDev ? err.message : '服务器开小差了，请稍后重试';
  }

  const response: ApiResponse = {
    code,
    msg: message,
  };

  res.status(statusCode).json(response);
};
