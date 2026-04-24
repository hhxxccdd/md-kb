import dotenv from 'dotenv'
import Redis from 'ioredis';
import nodemailer from 'nodemailer';
dotenv.config()

// ================== 1. Redis 配置（Windows 本地 Redis） ==================
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

// Redis 验证码 Key 前缀
export const EMAIL_CODE_KEY = 'email:code:';
// 验证码 5 分钟过期
export const CODE_EXPIRE = 300;

// ================== 2. QQ 邮箱配置 ==================
export const EMAIL_CONFIG = {
  host: 'smtp.qq.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || '541033895@qq.com',
    pass: process.env.EMAIL_PASS || 'crxlaqmdleeubfgf',
  },
};

// ================== 3. 双Token配置 ==================
export const JWT_CONFIG = {
    //密钥
    secret: process.env.JWT_SECRET as string,
    //Access Token过期时间:2小时
    accessExp: 60 * 60 * 2,
    //Refresh  Token过期时间:2小时
    refreshExp: 60 * 60 * 24 * 7
}

export const CODE_CONFIG = {
    length: 6,
    expire: 60 * 5
}