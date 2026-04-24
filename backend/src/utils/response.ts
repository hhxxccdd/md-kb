import { Response } from "express";
import { ApiResponse, ApiCode } from './types/response'

//统一成功响应
export const success = (
    res: Response,
    data: unknown,
    msg: string = '操作成功',
    statusCode = 200
) => {
    const response: ApiResponse = { code: ApiCode.Success, data, msg }
    
    if (data && typeof data === 'object') {
        const dataObj = data as any
        if (dataObj.accessToken) {
            res.setHeader('x-access-token', dataObj.accessToken)
        }
        if (dataObj.refreshToken) {
            res.setHeader('x-refresh-token', dataObj.refreshToken)
        }
    }
    
    return res.status(statusCode).json(response)
}

// 统一失败响应
export const error = (
    res: Response,
    msg: string = '操作失败',
    statusCode = 500) => {
    const response:ApiResponse = {code:ApiCode.Error,data:null,msg}
    return res.status(statusCode).json(response)
};