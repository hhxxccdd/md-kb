import http from 'http'
import express from 'express';
import cors from 'cors';
import path from 'path';
import docrouter from './modules/doc/controller';
import aiRouter from './modules/ai/controller';
import uploadRouter from './modules/doc/upload'
import aiContextRouter from './modules/ai/context';
import userRouter from './modules/user/controller';
import { globalErrorHandler } from './middleware/errorMiddleware';
import { setupCollabServer } from './modules/collab/server';
import { flushAllSaves } from "./modules/collab/persistence";

const app = express();
const PORT = 3000;
const uploadsRoot = path.join(process.cwd(), 'src', 'uploads');

const server = http.createServer(app)
setupCollabServer(server)

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
server.listen(PORT, () => {
    console.log(`🚀 服务器正在运行: http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await flushAllSaves();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await flushAllSaves();
  process.exit(0);
});


