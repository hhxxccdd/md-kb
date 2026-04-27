import nodemailer from 'nodemailer';
import { EMAIL_CONFIG, redis, EMAIL_CODE_KEY, CODE_EXPIRE } from './config';
import type { SendEmailCodeDto, EmailLoginDto } from './type';
import { generateCode, generateTokenPair } from './service';
import { throwBusinessError } from '../../utils/throwError';
import prisma from '../../utils/prisma';
import { ApiCode } from '../../utils/types/response';
import { getUserAvatar, shouldRefreshAvatar } from '../../utils/getAvatar';

export const transporter = nodemailer.createTransport(EMAIL_CONFIG);

export const sendEmailCode = async (dto: SendEmailCodeDto): Promise<boolean> => {
  const { email } = dto;
  const code = generateCode();

  await transporter.sendMail({
    from: `"登录验证" <${EMAIL_CONFIG.auth.user}>`,
    to: email,
    subject: '您的登录验证码',
    html: `
      <div style="padding: 20px; font-family: Microsoft YaHei;">
        <h3>您好，您的登录验证码为：</h3>
        <h1 style="color: #409eff; letter-spacing: 8px; margin: 20px 0;">${code}</h1>
        <p>验证码有效期为 ${CODE_EXPIRE / 60} 分钟，请勿泄露给他人。</p>
      </div>
    `,
  });

  await redis.set(EMAIL_CODE_KEY + email, code, 'EX', CODE_EXPIRE);

  return true;
};

export const emailLogin = async (dto: EmailLoginDto) => {
  const { email, code } = dto;
  const cacheCode = await redis.get(EMAIL_CODE_KEY + email);

  if (!cacheCode) {
    throwBusinessError('验证码已过期，请重新获取', 400, ApiCode.InvalidParams);
  }
  if (cacheCode !== code) {
    throwBusinessError('验证码错误', 400, ApiCode.InvalidParams);
  }

  await redis.del(EMAIL_CODE_KEY + email);

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    throwBusinessError('用户不存在', 404, ApiCode.UserNotFound)
    return
  }

  let nextUser = user;
  if (shouldRefreshAvatar(user.avatar)) {
    nextUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatar: getUserAvatar(user.id) }
    });
  }

  const tokens = await generateTokenPair(nextUser.id);

  return {
    user: { id: nextUser.id, username: nextUser.username, email: nextUser.email, avatar: nextUser.avatar },
    ...tokens,
  };
};
