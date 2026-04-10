export interface ApiResponse {
    code: number,
    data?: unknown,
    msg?: string
}

export const ApiCode = {
    Success: 200,
    Error: 500,
    Unauthorized :401,  // 未认证
    Forbidden : 403,     // 无权限
} 