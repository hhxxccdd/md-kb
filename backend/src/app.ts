import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 测试接口
app.get('/', (req: express.Request, res: express.Response) => {
  res.send('Hello TypeScript + Express! 后端配置成功！');
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 服务器正在运行: http://localhost:${PORT}`);
});