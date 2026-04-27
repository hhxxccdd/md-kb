import { Response } from "express";
import { ApiResponse, ApiCode } from './types/response'

// 统一成功响应
export const success = (
    res: Response,
    data: unknown,
    msg: string = '操作成功',
    statusCode = 200
) => {
    const response: ApiResponse = { code: ApiCode.Success, data, msg }

    if (data && typeof data === 'object') {
        const dataObj = data as Record<string, unknown>
        if (dataObj.accessToken) {
            res.setHeader('x-access-token', String(dataObj.accessToken))
        }
        if (dataObj.refreshToken) {
            res.setHeader('x-refresh-token', String(dataObj.refreshToken))
        }
    }

    return res.status(statusCode).json(response)
}

// 统一失败响应
export const error = (
    res: Response,
    msg: string = '操作失败',
    statusCode = 500,
    code: number = ApiCode.InternalError
) => {
    const response: ApiResponse = { code, data: null, msg }
    return res.status(statusCode).json(response)
};
