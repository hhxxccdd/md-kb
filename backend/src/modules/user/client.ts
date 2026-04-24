import nodemailer from 'nodemailer';
import { EMAIL_CONFIG, redis, EMAIL_CODE_KEY, CODE_EXPIRE } from './config';
import type { SendEmailCodeDto, EmailLoginDto } from './type';
import { generateCode, generateTokenPair } from './service';
import { throwBusinessError } from '../../utils/throwError';
import prisma from '../../utils/prisma';

// 邮件发送器
export const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// ================== 对外核心函数 ==================
/**
 * 1. 发送QQ邮箱验证码（核心函数）
 * @param dto 前端传入的邮箱
 */
export const sendEmailCode = async (dto: SendEmailCodeDto): Promise<boolean> => {
  const { email } = dto;

  // 1. 生成6位验证码
  const code = generateCode();

  // 2. 发送QQ邮箱
  await transporter.sendMail({
    from: `"登录验证" <${EMAIL_CONFIG.auth.user}>`,
    to: email,
    subject: '您的登录验证码',
    html: `
      <div style="padding: 20px; font-family: 微软雅黑;">
        <h3>您好，您的登录验证码为：</h3>
        <h1 style="color: #409eff; letter-spacing: 8px; margin: 20px 0;">${code}</h1>
        <p>验证码有效期为5分钟，请勿泄露给他人！</p>
      </div>
    `,
  });

  // 3. 验证码存入 Redis（5分钟自动过期）
  await redis.set(EMAIL_CODE_KEY + email, code, 'EX', CODE_EXPIRE);

  return true;
};


/**
 * 2. QQ邮箱登录方法（核心函数）
 * @param dto 邮箱+验证码
 */
export const emailLogin = async (dto: EmailLoginDto) => {
  const { email, code } = dto;

  // 1. 从 Redis 取出验证码
  const cacheCode = await redis.get(EMAIL_CODE_KEY + email);

  // 2. 校验验证码
  if (!cacheCode) throw new Error('验证码已过期，请重新获取');
  if (cacheCode !== code) throw new Error('验证码错误');

  // 3. 登录成功，删除 Redis 中的验证码
  await redis.del(EMAIL_CODE_KEY + email);

  // 4. 模拟用户ID（实际从数据库查用户）
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) throwBusinessError('用户不存在',201)

  // 5. 生成双Token
  const tokens = await generateTokenPair(user!.id);

  return {
     user: { id: user!.id, username: user!.username, email: user!.email, avatar: user!.avatar },
    ...tokens,
  };
};



