import request from "../utils/request";
import type { ApiResponse } from "../type/api";

//sessionId的请求类型
interface GetSessionParams{
    user_id:number
    doc_id:number
}

// 通过 user_id + doc_id 获取 sessionId
// 后端返回 data 直接是 session_uuid 字符串
export const getSessionId = (params: GetSessionParams): Promise<ApiResponse<string>> => {
    return request.post('/ai/sessionId', params)
}
