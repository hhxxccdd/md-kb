import axios from "axios";
import { AI_CONFIG } from "./config";
import { ChatParams, AIError } from "./type";
import { throwAIError } from "../../middleware/errorMiddleware";

const aiClient = axios.create({
    baseURL: AI_CONFIG.API_URL,
    timeout: AI_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_CONFIG.API_KEY}`
    }
})

export const requestAI = async (params: ChatParams) => {
    try {
        // 无论是否流式请求，都设置为stream模式
        const response = await aiClient.post('', params, {
            responseType: 'stream',
            headers:{
                'X-DashScope-SSE': 'enable' // 【强制】通义千问专属：开启SSE流式响应
            }
        })
        return response.data
    } catch (error: any) {
        const errInfo: AIError = {
            code: error.response?.status || 500,
            message: 'AI服务异常'
        }
        if (error.response?.status === 401) errInfo.message = 'API_KEY错误或无效';
        if (error.response?.status === 429) errInfo.message = '接口调用超限，请稍后重试';
        if (error.code === 'ECONNABORTED') errInfo.message = 'AI接口请求超时';
        throwAIError(errInfo.message)
    }
}
