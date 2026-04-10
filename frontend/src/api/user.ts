import request from "../utils/request";
import type { ApiResponse } from "../type/api";


export interface registerUser{
    username:string,
    password:string,
    email?:string
}

export interface returnUser{
    id:number,
    username:string,
    emial:string,
    accessToken:string,
    refreshToken:string
}

//注册用户
export const registerUser = (data:registerUser):Promise<ApiResponse<returnUser>> => {
     return request.post('/user/register',data) 
}

//登录用户
export const loginUser = (data:registerUser):Promise<ApiResponse<returnUser>> => {
     return request.post('/user/login',data) 
}

