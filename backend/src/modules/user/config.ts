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