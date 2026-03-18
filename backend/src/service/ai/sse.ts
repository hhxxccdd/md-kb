import { Request, Response } from 'express';

export interface SSEData {
  content?: string;
  status?: 'loading' | 'done' | 'error';
}

export const initSSE = (req: Request, res: Response) => {
  // 标准SSE响应头
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 激活连接
  res.write(':ok\n\n');

  const send = (data: SSEData) => {
    // 严格单条消息发送
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // 【禁用主动关闭】这是关键！！！不要主动end
  const close = () => {
    // 只发done，不执行res.end()
    res.write(`data: ${JSON.stringify({ status: 'done' })}\n\n`);
  };



  return { send, close };
};