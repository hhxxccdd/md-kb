import { Router, Response, Request } from 'express'
import { hashPassword, comparePasseword } from '../../utils/bcrypt'
import { generateTokenPair, refreshAccessToken } from './service'
import { asyncHandler } from '../../utils/asyncHandler'
import prisma from '../../utils/prisma'
import { throwBusinessError } from '../../utils/throwError'
import { getUserAvatar, shouldRefreshAvatar } from '../../utils/getAvatar'
import { success } from '../../utils/response'
import { sendEmailCode, emailLogin } from './client'
import { ApiCode } from '../../utils/types/response'

const userRouter = Router()

// 注册
userRouter.post('/register', asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password } = req.body

    const existUser = await prisma.user.findUnique({
        where: { username }
    })

    const existEmail = await prisma.user.findUnique({
        where: { email }
    })

    if (existUser) {
        throwBusinessError('用户名已存在', 400, ApiCode.UsernameExists)
    }
    if (existEmail) {
        throwBusinessError('邮箱已存在', 400, ApiCode.EmailExists)
    }

    const hashPwd = await hashPassword(password)

    const createdUser = await prisma.user.create({
        data: { username, email, password_hash: hashPwd, last_login_at: new Date() }
    })

    const avatar = getUserAvatar(createdUser.id)
    const user = await prisma.user.update({
        where: { id: createdUser.id },
        data: { avatar }
    })

    const tokens = await generateTokenPair(user.id)

    const data = {
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
        ...tokens
    }

    success(res, data, '注册成功')
}))

// 发送邮箱验证码
userRouter.post('/sendEmailCode', asyncHandler(async (req, res) => {
    const { email } = req.body

    const existEmail = await prisma.user.findUnique({
        where: { email }
    })

    if (!existEmail) {
        throwBusinessError('邮箱不存在', 404, ApiCode.UserNotFound)
        return
    }

    await sendEmailCode({ email })
    success(res, {}, '发送成功')
}))

// 邮箱登录
userRouter.post('/emailLogin', asyncHandler(async (req, res) => {
    const { email, code } = req.body
    const data = await emailLogin({ email, code })
    success(res, data, '登录成功')
}))

// 密码登录接口
userRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body

    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) {
        throwBusinessError('用户名不存在', 404, ApiCode.UserNotFound)
        return
    }

    const valid = await comparePasseword(password, user.password_hash)

    if (!valid) {
        throwBusinessError('密码错误', 401, ApiCode.PasswordIncorrect)
    }

    let nextUser = user
    if (shouldRefreshAvatar(user.avatar)) {
        nextUser = await prisma.user.update({
            where: { id: user.id },
            data: { avatar: getUserAvatar(user.id) }
        })
    }

    const tokens = await generateTokenPair(nextUser.id)

    const data = {
        user: { id: nextUser.id, username: nextUser.username, email: nextUser.email, avatar: nextUser.avatar },
        ...tokens
    }

    success(res, data, '登录成功')
}))

// 刷新 refreshToken
userRouter.post('/refreshToken', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body
    const tokens = await refreshAccessToken(refreshToken)
    success(res, tokens, '刷新成功')
}))

export default userRouter
