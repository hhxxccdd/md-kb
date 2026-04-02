//管理AI上下文内容
import express from "express";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { success } from "../../utils/response";

const aiContextRouter = express.Router()
const prisma = new PrismaClient()

//配置上下文截断，上下文记忆只选最近10条
const MAX_CONTEXT_MESSAGES = 10


//1.通过user_id和doc_id获取session_id
aiContextRouter.post('/sessionId', async (req, res) => {

    const { user_id, doc_id } = req.body
    let session = await prisma.chatSession.findFirst({
        where: {
            user_id: Number(user_id),
            doc_id: Number(doc_id)
        }
    })

    if (!session) {
        session = await prisma.chatSession.create({
            data: {
                session_uuid: uuidv4(),
                user_id: Number(user_id),
                doc_id: Number(doc_id),
            }
        })
    }

    success(res,session.session_uuid,'获取成功')
})

//2.获取上下文，截取最近MAX_CONTEXT_MESSAGES条
aiContextRouter.get('/context/:session_id', async (req, res) => {
    const { session_id } = req.params
    const messages = await prisma.chatMessage.findMany({
        where: { session_id: session_id },
        orderBy: { created_at: 'asc' },
        take: MAX_CONTEXT_MESSAGES
    })
    success(res, messages, '获取成功')
})




//3.保存单条消息
aiContextRouter.post('/message', async (req, res) => {

    const { session_id, role, content } = req.body
    const message = await prisma.chatMessage.create({
        data: {
            session_id: session_id,
            role: role,
            content: content
        }
    })

    success(res, message, '插入成功')

})


export default aiContextRouter