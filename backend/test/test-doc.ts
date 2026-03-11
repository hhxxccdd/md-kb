import prisma from '../src/utils/prisma'

async function test() {
  // 1. 创建文档
  const doc = await prisma.document.create({
    data: {
      title: '我的第一个文档',
      content: '# Hello Prisma'
    }
  })
  console.log('创建成功：', doc)

  // 2. 查询所有文档
  const list = await prisma.document.findMany()
  console.log('所有文档：', list)
}

test().catch(err => console.log('错误：', err))