import express from 'express';
import cors from 'cors';
import path from 'path';
import docrouter from './modules/doc/doc';
import aiRouter from './modules/ai/controller';
import uploadRouter from './modules/doc/upload'
import aiContextRouter from './modules/ai/context';
import { globalErrorHandler } from './middleware/errorMiddleware';

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());
app.use('/uploads',express.static(path.join(__dirname,'uploads')))


app.use('/api/doc',docrouter)
app.use('/api/ai',aiRouter,aiContextRouter)
app.use('/api/upload',uploadRouter)

app.use(globalErrorHandler)


// 启动服务
app.listen(PORT, () => {
    console.log(`🚀 服务器正在运行: http://localhost:${PORT}`);
});


