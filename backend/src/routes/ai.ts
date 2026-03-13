import express from 'express'
import axios from 'axios'


//定义API配置
const API_URL = process.env.API_URL ?? 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
const API_KEY = process.env.TONGYI_API_KEY

const router = express.Router()

//AI测试接口
router.get('/TONGYI', (req: express.Request, res: express.Response) => {
    if (!API_KEY) {
        console.log('请先在 .env 文件中配置 TONGYI_API_KEY')
    }

    const content = req.query.content

    axios.post(API_URL,
        {
            model: 'qwen-turbo', // 模型名称，也可以用 qwen-plus 等
            input: {
                messages: [
                    {
                        role: 'user',
                        content: content // 测试问题
                    }
                ]
            },
            parameters: {
                temperature: 0.7 // 控制随机性
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        }).then((response) => {
             res.send(response.data.output.text)  
        })

      
})

export default router