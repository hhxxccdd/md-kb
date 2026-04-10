import axios from "axios";
import { ElMessage } from 'element-plus'
import router from '../router'

//创建axios实例
const request = axios.create({
    baseURL: 'http://localhost:3000/api',
    timeout: 10000
})

declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        _retry?: boolean
    }
}


//请求拦截器
request.interceptors.request.use((config) => {

    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
    if (refreshToken) config.headers['x-refresh-Token'] = refreshToken
    return config

})

//响应拦截器
request.interceptors.response.use(
    response => {
        // 自动更新响应头里的新 Token
        const newAccess = response.headers['x-access-token']
        const newRefresh = response.headers['x-refresh-token']
        if (newAccess) localStorage.setItem('accessToken', newAccess)
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh)
        return response.data
    },
    async (error) => {

        const originalRequest = error.config

        //处理401
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true
            const refreshToken = localStorage.getItem('refreshToken')

            if (!refreshToken) {
                // 没 RefreshToken，直接去登录
                localStorage.clear()
                ElMessage.error('登录已过期')
                router.push('/login')
                return Promise.reject(error)
            }
            try {
                //刷新Token
                const res = await axios.post(`${request.defaults.baseURL}/user/refreshToken`, { refreshToken })

                const { accessToken, refreshToken: newRefresh } = res.data.data

                localStorage.setItem('accessToken', accessToken)
                if (newRefresh) localStorage.setItem('refreshToken', newRefresh)

                // 重发原请求
                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                return request(originalRequest)
            } catch (err) {
                localStorage.clear()
                ElMessage.error('登录已过期')
                router.push('/login')
                return Promise.reject(err)
            }
        }
        return Promise.reject(error)
    }

)

export default request