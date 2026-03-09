import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as dotenv from 'dotenv'

//加载.env文件中的环境变量
dotenv.config()

//定义API配置
const API_URL = process.env.API_URL ?? 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
const API_KEY = process.env.TONGYI_API_KEY

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());

// 测试接口
app.get('/', (req: express.Request, res: express.Response) => {
    res.send('Hello TypeScript + Express! 后端配置成功！');
});

//AI测试接口
app.get('/TONGYI', (req: express.Request, res: express.Response) => {
    if (!API_KEY) {
        res.send('请先在 .env 文件中配置 TONGYI_API_KEY')
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



// 启动服务
app.listen(PORT, () => {
    console.log(`🚀 服务器正在运行: http://localhost:${PORT}`);
});


