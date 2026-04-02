import request from '../utils/request';
import type { ApiResponse } from '../type/api';
import type { ChatMessage } from '../type/chat';


//获取上下文
export const getContext = (session_id: string): Promise<ApiResponse<ChatMessage[]>> => {
  return request.get(`/ai/context/${session_id}`);
};


// 保存消息
export const saveMessage = (data: { session_id: string; role: string; content: string }) => {
  return request.post('/ai/message', data);
};


