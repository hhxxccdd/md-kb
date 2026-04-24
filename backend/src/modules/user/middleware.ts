import { NextFunction, Request, Response } from "express";
import { throwAuthError} from "../../utils/throwError";
import { asyncHandler } from "../../utils/asyncHandler";
import { refreshAccessToken, verifyAccessToken } from "./service";
import { TokenPair } from "./type";


//鉴权+无感刷新中间件
export const authMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.headers.authorization
    
    
    const accessToken = authHeader?.startsWith('Bearer ') 
        ? authHeader.slice(7).trim()
        : undefined
    
    const refreshToken = req.headers['x-refresh-token'] as string;

    console.log('====== accessToken:', accessToken, '======')
    console.log('====== refreshToken:', refreshToken, '======')

    if (!accessToken) {
        throwAuthError('请先登录',201)
        return
    }

    try {
        const userId = await verifyAccessToken(accessToken)
        req.user = { id: userId }
        return next()
    } catch (e: any) {
        
        if (!refreshToken) {
            throwAuthError('登录已过期，请重新登录', 201);
        }

        const tokens  = await refreshAccessToken(refreshToken) as TokenPair;

        //设置响应头
        res.setHeader('x-access-token', tokens.accessToken);
        res.setHeader('x-refresh-token', tokens.refreshToken);

        const userId = await verifyAccessToken(tokens.accessToken);
        req.user = { id: userId };
        next();
    }
})