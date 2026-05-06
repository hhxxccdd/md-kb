import express from 'express';
import cors from 'cors';
import path from 'path';
import docrouter from './modules/doc/controller';
import aiRouter from './modules/ai/controller';
import uploadRouter from './modules/doc/upload'
import aiContextRouter from './modules/ai/context';
import userRouter from './modules/user/controller';
import { globalErrorHandler } from './middleware/errorMiddleware';

const app = express();
const PORT = 3000;
const uploadsRoot = path.join(process.cwd(), 'src', 'uploads');


app.use(cors({
  exposedHeaders: ['x-access-token', 'x-refresh-token']
}));

app.use(express.json());
app.use('/uploads', express.static(uploadsRoot))


app.use('/api/doc',docrouter)
app.use('/api/ai',aiRouter,aiContextRouter)
app.use('/api/upload',uploadRouter)
app.use('/api/user',userRouter)

app.use(globalErrorHandler)


// 启动服务
app.listen(PORT, () => {
    console.log(`🚀 服务器正在运行: http://localhost:${PORT}`);
});


