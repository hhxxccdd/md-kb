import { Request, Response } from 'express';

// 统一状态枚举（规范代码）
export const SSEStatus = {
    LOADING: 'loading',
    DONE: 'done',
    ERROR: 'error'
} as const


export interface SSEData {
    content?: string;
    status?: 'loading' | 'done' | 'error';
    message?: string
}

export const initSSE = (req: Request, res: Response) => {
    // 标准SSE响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');


    //客户端断开后，3秒自动重连
    res.write('retry: 3000\n\n')
    // 激活连接
    res.write(':connected\n\n');

    const send = (data: Partial<SSEData>) => {
        const playload: SSEData = {
            status: SSEStatus.LOADING,
            ...data
        }
        // 标准SSE格式推送
        res.write(`data: ${JSON.stringify(playload)}\n\n`);
    };


    //关闭连接
    const cleanup = () => {
        if (!res.writableEnded) {
            res.end()
        }
    }

    //前端手动终止
    res.on('close', cleanup)

    //监听异常
    req.on('error', (err) => {
        send({ status: SSEStatus.ERROR, message: '连接异常断开' });
        cleanup();
    })

    const close = () => {
        // 只发done，不执行res.end()
        send({ status: SSEStatus.DONE })
        cleanup()
    };


    return { send, close };
};