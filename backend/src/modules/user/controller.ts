import { Router, Response, Request } from 'express'
import { hashPassword, comparePasseword } from '../../utils/bcrypt'
import { generateTokenPair, refreshAccessToken, verifyAccessToken } from './service'
import { asyncHandler } from '../../utils/asyncHandler'
import prisma from '../../utils/prisma'
import { throwBusinessError } from '../../utils/throwError'
import { getRandomAvatar } from '../../utils/getAvatar'
import { success } from '../../utils/response'

const userRouter = Router()


//注册
userRouter.post('/register', asyncHandler(async (req: Request, res: Response) => {

    const { username, email, password } = req.body
    //校验用户是否存在
    const existUser = await prisma.user.findUnique({
        where: { username: username }
    })
    if (existUser) {
        throwBusinessError('用户名已存在',201)
    }

    //生成加密密码
    const hashPwd = await hashPassword(password)

    //获取随机头像
    const avatar = getRandomAvatar()

    const user = await prisma.user.create({
        data: { username, email, password_hash: hashPwd, avatar: avatar, last_login_at: new Date() }
    })

    //获取Token 
    const tokens = await generateTokenPair(user.id)

    const data = {
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
        ...tokens
    }

    success(res, data, '注册成功')
}))


//密码登录接口
userRouter.post('/login', asyncHandler(async (req, res) => {

    const { username, password } = req.body
    //找用户
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) {
        throwBusinessError('用户名不存在',201)
        return
    }

    //校验密码
    const valid = await comparePasseword(password, user.password_hash)

    if (!valid) {
        throwBusinessError('密码错误',201)
    }

    //获取Token 
    const tokens = await generateTokenPair(user.id)

    const data = {
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
        ...tokens
    }

    success(res, data, '登录成功')

}))


//刷新refreshToken
userRouter.post('/refreshToken',asyncHandler(async (req,res) => {
     const {refreshToken} = req.body
     const tokens = await refreshAccessToken(refreshToken)
     success(res,tokens,'刷新成功')
}))

export default userRouter