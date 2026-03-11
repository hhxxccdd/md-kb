import { Response } from "express";
import { ApiResponse, ApiCode } from '../types/response'

//统一成功响应
export const success = (
    res: Response,
    data: unknown,
    msg: string = '操作成功',
    statusCode = 200
) => {
    const response: ApiResponse = { code: ApiCode.Success, data, msg }
    return res.status(statusCode).json(response)
}