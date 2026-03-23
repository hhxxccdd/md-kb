import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type {Request,Response} from 'express'

//单用户一分钟最多10次调用
const aiRateLimiter = rateLimit({
    windowMs:60*1000,
    max:10,
    message:{code:429,msg:'调用过于频繁，一分钟后再试'},
    standardHeaders:true,
    legacyHeaders:false,
    //TS类型声明
    keyGenerator: (req:Request) => ipKeyGenerator(req.ip || 'unKonwn-Client')
})

export default aiRateLimiter