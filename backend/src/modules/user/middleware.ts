import { NextFunction, Request, Response } from "express";
import { throwAuthError } from "../../utils/throwError";
import { asyncHandler } from "../../utils/asyncHandler";
import { verifyAccessToken } from "./service";
import { ApiCode } from "../../utils/types/response";

// 鉴权中间件：只做 accessToken 校验，刷新逻辑统一交给前端处理
export const authMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization

    const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined

    console.log('====== accessToken:', accessToken, '======')

    if (!accessToken) {
        throwAuthError('请先登录', 401, ApiCode.LoginExpired)
        return
    }

    const userId = await verifyAccessToken(accessToken)
    req.user = { id: userId }
    return next()
})
