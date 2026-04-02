import { PrismaClient } from '@prisma/client'

//单例模式，全局维护
const prisma = new PrismaClient()

export default prisma