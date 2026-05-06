//对话消息类型
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

//AI 请求参数
export interface ChatParams {
    model: string
    input: { messages: ChatMessage[] }
    parameters?: {
        stream?: boolean
        result_format?: 'text' | 'message'
        incremental_output?: boolean
    }
}

//标准化错误
export interface AIError {
     code:number
     message:string
}




