import jwt from 'jsonwebtoken'
import prisma from '../../utils/prisma'
import { JWT_CONFIG } from './config'
import { TokenPair, AccessTokenPayload, RefreshTokenPayload } from './type'
import { throwAuthError } from '../../utils/throwError'

const refreshPromises = new Map<number, Promise<TokenPair>>()

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

    console.log('accessToken:', accessToken)
    console.log('refreshToken:', refreshToken)

    return { accessToken, refreshToken }
}



// 刷新Token
export const refreshAccessToken = async (refreshToken: string) => {
    try {
        // 校验Refresh Token
        const payload = jwt.verify(refreshToken, JWT_CONFIG.secret) as RefreshTokenPayload
        if (payload.type !== 'refresh') throwAuthError('无效的Refresh Token', 201)

        // 校验数据库里的Refresh Token，防止冒用
        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        })
        if (!user || user.refreshToken !== refreshToken) throwAuthError('Refresh Token已失效', 201)

        // 如果已经有正在刷新的Promise，直接返回那个Promise（防止并发刷新）
        if (refreshPromises.has(payload.userId)) {
            console.log('====== 复用已有的刷新Promise，用户ID:', payload.userId, '======')
            return refreshPromises.get(payload.userId)!
        }

        console.log('====== 创建新的刷新Promise，用户ID:', payload.userId, '======')
         
        // 创建刷新Promise并缓存
        const promise = (async () => {
            try {
                return await generateTokenPair(payload.userId)
            } finally {
                refreshPromises.delete(payload.userId)
                console.log('====== 删除刷新Promise缓存，用户ID:', payload.userId, '======')
            }
        })()

        refreshPromises.set(payload.userId, promise)
        return promise
    } catch (e) {
        throwAuthError('Refresh Token无效，请重新登录', 201)
    }
}

// 校验Access Token
export const verifyAccessToken = async (accessToken: string) => {
   
    const payload = jwt.verify(accessToken, JWT_CONFIG.secret) as AccessTokenPayload
   
    if (payload.type !== 'access') throwAuthError('无效的Access Token', 201)
    return payload.userId
}


export const generateCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
