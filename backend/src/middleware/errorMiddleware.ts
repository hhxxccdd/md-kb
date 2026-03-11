import { Request,Response,NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ApiResponse,ApiCode } from "../types/response";

//全局异常捕获中间件
export const globalErrorHandler = (err:Error,req:Request,res:Response,next:NextFunction) => {

       let code = ApiCode.Error
       let msg = '服务器异常'
       let statusCode = 500

       //Prisma数据库错误
       if(err instanceof Prisma.PrismaClientKnownRequestError){
          //记录不存在(update/delete)
          if(err.code === 'P2025'){
             msg = '文档不存在'
             statusCode = 404
          }
          //字段重复
          if(err.code === 'P2002'){
            msg = '数据重复'
            statusCode = 400 
          }
       }

       //自定义业务错误
       if(err.name === 'BusinessError'){
          msg = err.message
          statusCode = 400
       }

       //统一返回
       const response:ApiResponse = {code,msg}
       res.status(statusCode).json(response)
}

//抛出业务错误工具
export const throwBusinessError = (message:string) => {
    const error = new Error(message)
    //自定义的业务错误
    error.name = 'BusinessError'
    throw error
}