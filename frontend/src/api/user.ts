import request from "../utils/request";
import type { ApiResponse } from "../type/api";


export interface registerUser {
    username: string,
    password: string,
    email?: string
}

export interface UserInfo {
    id: number
    username: string
    email: string 
    avatar: string
}

export interface returnUser {
    user: UserInfo,
    accessToken: string,
    refreshToken: string
}

export interface EmailLoginDto {
    email: string,
    code: string
}

//注册用户
export const registerUser = (data: registerUser): Promise<ApiResponse<returnUser>> => {
    return request.post('/user/register', data)
}

//登录用户
export const loginUser = (data: registerUser): Promise<ApiResponse<returnUser>> => {
    return request.post('/user/login', data)
}

//邮箱登录
export const emailLoginUser = (data: EmailLoginDto): Promise<ApiResponse<returnUser>> => {
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
