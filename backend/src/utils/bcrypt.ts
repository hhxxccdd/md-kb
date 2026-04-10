import bcrypt from 'bcryptjs'

// 盐的复杂度（加密轮数)
const SALT_ROUNDS = 10;

/**
 * 1. 加密明文密码
 * @param plainPassword 用户输入的原始密码
 * @returns 加密后的哈希字符串
 */
export const hashPassword = async(plainPassword:string): Promise<string> => {

    return await bcrypt.hash(plainPassword,SALT_ROUNDS)

}

/**
 * 2. 比对密码（登录时用）
 * @param plainPassword 用户登录输入的明文密码
 * @param hashedPassword 数据库里存的那个加密字符串
 * @returns boolean (匹配成功返回 true)
 */
export const comparePasseword = async(plainPassword:string,hashPassword:string):Promise<boolean> => {
      
   return await bcrypt.compare(plainPassword,hashPassword)

} 
