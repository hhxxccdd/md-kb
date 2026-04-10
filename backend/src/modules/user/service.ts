import jwt from 'jsonwebtoken'
import prisma from '../../utils/prisma'
import { JWT_CONFIG } from './config'
import { TokenPair, AccessTokenPayload, RefreshTokenPayload } from './type'
import { throwAuthError } from '../../utils/throwError'

//生成双Token
export const generateTokenPair = async (userId: number): Promise<TokenPair> => {

    //生成Access Token
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

    return { accessToken, refreshToken }
}

// 刷新Token
export const refreshAccessToken = async (refreshToken: string) => {
    try {
        // 校验Refresh Token
        const payload = jwt.verify(refreshToken, JWT_CONFIG.secret) as RefreshTokenPayload
        if (payload.type !== 'refresh') throwAuthError('无效的Refresh Token')

        // 校验数据库里的Refresh Token，防止冒用
        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        })
        if (!user || user.refreshToken !== refreshToken) throwAuthError('Refresh Token已失效')

        // 生成新的双Token
        return generateTokenPair(payload.userId)
    } catch (e) {
        throwAuthError('Refresh Token无效，请重新登录')
    }
}

// 校验Access Token
export const verifyAccessToken = async (accessToken: string) => {
    const payload = jwt.verify(accessToken, JWT_CONFIG.secret) as AccessTokenPayload
    if (payload.type !== 'access') throwAuthError('无效的Access Token')
    return payload.userId
}