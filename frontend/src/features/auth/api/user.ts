import request from "../../../shared/api/request";
import type { ApiResponse } from "../../../shared/types/api";
import type {
    AuthCredentials,
    AuthResult,
    EmailLoginDto,
} from "../types/user";

//注册用户
export const registerUser = (data: AuthCredentials): Promise<ApiResponse<AuthResult>> => {
    return request.post('/user/register', data)
}

//登录用户
export const loginUser = (data: AuthCredentials): Promise<ApiResponse<AuthResult>> => {
    return request.post('/user/login', data)
}

//邮箱登录
export const emailLoginUser = (data: EmailLoginDto): Promise<ApiResponse<AuthResult>> => {
    return request.post('/user/emailLogin', data)
}

//发送邮箱验证码
export const sendEmailCode = (data: { email: string }): Promise<ApiResponse<string>> => {
    return request.post('/user/sendEmailCode', data)
}

// 根据用户 id 获取用户名
export const getUserNameById = (id: string | number): Promise<ApiResponse<string>> => {
    return request.get(`/user/getUserById/${id}`)
}
