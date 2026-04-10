// middlewares/globalErrorHandler.ts
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
  let code = ApiCode.Error;
  let message = '服务器内部错误';

  // 1. 处理我们自定义的 AppError (通过 errorCode 字段识别)
  if ('errorCode' in err) {
    const appErr = err as AppError;
    statusCode = appErr.statusCode;
    message = appErr.message;
    // 根据 statusCode 映射 ApiCode（可选）
    if (statusCode === 401) code = ApiCode.Unauthorized;
    else if (statusCode === 403) code = ApiCode.Forbidden;
    else code = ApiCode.Error;
  }
  
  // 2. 处理 Prisma 错误
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
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
    code = ApiCode.Error;
  }
  
  // 3. 处理 Prisma 验证错误
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = '请求参数格式不正确';
    code = ApiCode.Error;
  }
  
  // 4. 未知错误（系统级崩溃）
  else {
    console.error('💥 系统未知错误:', err);
    const isDev = process.env.NODE_ENV === 'development';
    message = isDev ? err.message : '服务器开小差了，请稍后重试';
  }

  const response: ApiResponse = {
    code,
    msg: message,
  };

  res.status(statusCode).json(response);
};