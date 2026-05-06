import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import prisma from '../../utils/prisma'
import { JWT_CONFIG } from './config'
import { TokenPair, AccessTokenPayload, RefreshTokenPayload } from './type'
import { throwAuthError, throwBusinessError } from '../../utils/throwError'
import { ApiCode } from '../../utils/types/response'

const refreshPromises = new Map<number, Promise<TokenPair>>()

// 生成 Token 对
export const generateTokenPair = async (userId: number): Promise<TokenPair> => {
    const accessToken = jwt.sign(
        { userId, type: 'access' } as AccessTokenPayload,
        JWT_CONFIG.secret,
        { expiresIn: JWT_CONFIG.accessExp }
    )

    const refreshToken = jwt.sign(
        { userId, type: 'refresh' } as RefreshTokenPayload,
        JWT_CONFIG.secret,
        { expiresIn: JWT_CONFIG.refreshExp }
    )

    await prisma.user.update({
        where: { id: userId },
        data: { refreshToken }
    })

    console.log('accessToken:', accessToken)
    console.log('refreshToken:', refreshToken)

    return { accessToken, refreshToken }
}

// 刷新 Token
export const refreshAccessToken = async (refreshToken: string) => {
    try {
        const payload = jwt.verify(refreshToken, JWT_CONFIG.secret) as RefreshTokenPayload
        if (payload.type !== 'refresh') {
            throwAuthError('无效的 Refresh Token', 401, ApiCode.RefreshTokenInvalid)
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        })
        
        if (!user || user.refreshToken !== refreshToken) {
            throwAuthError('Refresh Token 已失效', 401, ApiCode.RefreshTokenExpired)
        }

        if (refreshPromises.has(payload.userId)) {
            console.log('====== 复用已有的刷新 Promise，用户ID:', payload.userId, '======')
            return refreshPromises.get(payload.userId)!
        }

        console.log('====== 创建新的刷新 Promise，用户ID:', payload.userId, '======')

        const promise = (async () => {
            try {
                return await generateTokenPair(payload.userId)
            } finally {
                refreshPromises.delete(payload.userId)
                console.log('====== 删除刷新 Promise 缓存，用户ID:', payload.userId, '======')
            }
        })()

        refreshPromises.set(payload.userId, promise)
        return promise
    } catch (e) {
        if (e instanceof TokenExpiredError) {
            throwAuthError('Refresh Token 已过期，请重新登录', 401, ApiCode.RefreshTokenExpired)
        }
        if (e instanceof JsonWebTokenError) {
            throwAuthError('Refresh Token 无效，请重新登录', 401, ApiCode.RefreshTokenInvalid)
        }
        throw e
    }
}

// 校验 Access Token
export const verifyAccessToken = async (accessToken: string) => {
    try {
        const payload = jwt.verify(accessToken, JWT_CONFIG.secret) as AccessTokenPayload

        if (payload.type !== 'access') {
            throwAuthError('无效的 Access Token', 401, ApiCode.AccessTokenInvalid)
        }
        return payload.userId
    } catch (e) {
        if (e instanceof TokenExpiredError) {
            throwAuthError('Access Token 已过期', 401, ApiCode.AccessTokenExpired)
            
        }
        if (e instanceof JsonWebTokenError) {
            throwAuthError('无效的 Access Token', 401, ApiCode.AccessTokenInvalid)
        }
        throw e
    }
}


//根据id查找用户姓名
export const getUserNameById = async (userId:number) => {
    if (!Number.isInteger(userId) || userId <= 0) {
        throwBusinessError('无效的用户 id', 400, ApiCode.InvalidParams)
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            avatar: true
        }
    })

    if (!user) {
        throwBusinessError('用户不存在', 404, ApiCode.UserNotFound)
    }

    return user
}

export const generateCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


