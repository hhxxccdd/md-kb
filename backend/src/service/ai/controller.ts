import { Request, Response, Router } from "express";
import { requestAI } from "./client";
import { initSSE } from "./sse";
import { AI_CONFIG } from "./config";
import { throwBusinessError } from "../../middleware/errorMiddleware";
import { ChatParams } from "./type";

const aiRouter = Router()

// POST /api/ai/test-stream 流式测试接口
aiRouter.post('/test-stream', async (req: Request, res: Response) => {
    try {
    
        const prompt = req.body.prompt;
        if (!prompt) throwBusinessError('请输入prompt');
        // 初始化SSE
        const { send, close } = initSSE(req, res);
       
        // 构建AI请求参数
        const params: ChatParams = {
            model: AI_CONFIG.MODEL as string,
            input: { messages: [{ role: 'user', content: prompt }] },
            parameters: { stream: true },
            incremental_output: true
        };
  
        //调用流式AI响应接口
        const stream = await requestAI(params);
      
        let buffer = '';
        let lastText = ''; // 🔥 核心：记录上一次的完整文本，用于计算增量

        // 监听AI流式数据
        stream.on('data', (chunk: Buffer) => {
            console.log('🔥 【收到通义千问原始分片】',chunk.toString('utf-8'));
            buffer += chunk.toString('utf8');
            // 按SSE标准分割消息
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            // 处理每条完整消息
            for (const event of events) {
                if (!event.trim()) continue;

                // 只提取 data 行，忽略 id/event 行
                const dataLine = event.split('\n').find(line => line.startsWith('data:'));
                if (!dataLine) continue;

                try {
                    // 解析JSON
                    const jsonStr = dataLine.replace(/^data:\s*/, '').trim();
                    const data = JSON.parse(jsonStr);
                    const fullText = data.output?.text || '';

                    // 🔥 关键修复：计算【增量内容】，只推送新文字（解决重复！）
                    const incrementalContent = fullText.slice(lastText.length);
                    lastText = fullText; // 更新上一次文本

                    // 只发送有内容的增量
                    if (incrementalContent) {
                        send({ content: incrementalContent });
                    }

                    // 流式结束，关闭连接
                    if (data.output?.finish_reason === "stop") {
                        setTimeout(() => {
                            send({ status: 'done' });
                            close();
                        }, 100);
                    }
                } catch (e) {
                    // 忽略非数据帧的解析错误
                    continue;
                }
            }
        });

        // 错误监听
        stream.on('error', (err: any) => {
            send({ status: 'error', content: err.message });
            close();
        });

        // 流结束
        stream.on('end', () => {
            close();
        });

    } catch (error: any) {
        res.write(`data: ${JSON.stringify({ status: 'error', content: error.message })}\n\n`);
        res.end();
    }
});

export default aiRouter