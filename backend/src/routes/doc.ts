import express from 'express'
import prisma from '../utils/prisma'
import { success } from '../utils/response'
import { asyncHandler } from '../utils/asyncHandler'
import { throwBusinessError } from '../middleware/errorMiddleware'

const router = express.Router()

//验证Id是否有效
const validateId = (id: string): number => {

    const num = parseInt(id)
    if (isNaN(num)) throwBusinessError('无效的文档Id')
    return num

}

//获取文档的列表
router.get('/', asyncHandler(async (req, res) => {
    const list = await prisma.document.findMany({
        orderBy: { updatedAt: 'desc' }
    })
    success(res, list)
}))

//新建文档
router.post('/', asyncHandler(async (req, res) => {
    const { title, content } = req.body
    console.log(title,content)
    if (!title) throwBusinessError('文档标题不能为空')

    const doc = await prisma.document.create({
        data: { title, content }
    })
    success(res, doc, '创建成功', 201)
}))

//获取单个文档
router.get('/:id', asyncHandler(async (req, res) => {
    const id = validateId(req.params.id as string)
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) throwBusinessError('文档不存在')
    success(res, doc, '获取成功')
}))

//修改单个文档
router.post('/:id', asyncHandler(async (req, res) => {
    const id = validateId(req.params.id as string)
    const { title, content } = req.body
    if (!title) throwBusinessError('文档标题不能为空')

    const doc = await prisma.document.update({
        where: { id },
        data: { title, content }
    })

    success(res, doc, '更新成功')
}))

//删除文档
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = validateId(req.params.id as string)
    await prisma.document.delete({ where: { id } })
    success(res,null,'删除成功')
}))

export default router
