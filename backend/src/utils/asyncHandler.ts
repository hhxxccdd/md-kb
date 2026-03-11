import { Request,Response,NextFunction } from "express";

//express原生异步处理工具
export const asyncHandler = ( fn:(req:Request,res:Response,next:NextFunction) => Promise<any> ) => {
         return (req:Request,res:Response,next:NextFunction) => {
               Promise.resolve(fn(req,res,next)).catch(next)
         }
}

