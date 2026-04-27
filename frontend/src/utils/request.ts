import axios from "axios";
import { ElMessage } from 'element-plus'
import router from '../router'
import { ApiCode } from '../type/api'

const request = axios.create({
    baseURL: 'http://localhost:3000/api',
    timeout: 10000
})

declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        _retry?: boolean
        _skipAuthRefresh?: boolean
    }
}

let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null

const clearAuthAndRedirect = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userInfo')
    ElMessage.error('登录已过期')
    router.push('/login')
}

const refreshAuthToken = async (refreshToken: string) => {
    if (!refreshPromise) {
        refreshPromise = request
            .post('/user/refreshToken', { refreshToken }, { _skipAuthRefresh: true } as any)
            .then((res) => {
                const { accessToken, refreshToken: newRefreshToken } = res.data
                localStorage.setItem('accessToken', accessToken)
                localStorage.setItem('refreshToken', newRefreshToken)
                return { accessToken, refreshToken: newRefreshToken }
            })
            .finally(() => {
                refreshPromise = null
            })
    }

    return refreshPromise
}

request.interceptors.request.use((config) => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    config.headers = config.headers ?? {}
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
    if (refreshToken) config.headers['x-refresh-token'] = refreshToken

    return config
})

request.interceptors.response.use(
    response => {
        const accessToken = response.headers['x-access-token']
        const refreshToken = response.headers['x-refresh-token']

        if (typeof accessToken === 'string') {
            localStorage.setItem('accessToken', accessToken)
        }
        if (typeof refreshToken === 'string') {
            localStorage.setItem('refreshToken', refreshToken)
        }
        return response.data
    },
    async (error) => {
        const originalRequest = error.config
        const status = error.response?.status
        const code = error.response?.data?.code

        if (
            status === 401 &&
            code === ApiCode.AccessTokenExpired &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest._skipAuthRefresh
        ) {
            originalRequest._retry = true
            const refreshToken = localStorage.getItem('refreshToken')

            if (!refreshToken) {
                clearAuthAndRedirect()
                return Promise.reject(error)
            }

            try {
                const { accessToken } = await refreshAuthToken(refreshToken)
                originalRequest.headers = originalRequest.headers ?? {}
                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                return request(originalRequest)
            } catch (err) {
                clearAuthAndRedirect()
                return Promise.reject(err)
            }
        }

        if (
            status === 401 &&
            (
                code === ApiCode.RefreshTokenExpired ||
                code === ApiCode.RefreshTokenInvalid ||
                code === ApiCode.LoginExpired
            )
        ) {
            clearAuthAndRedirect()
        }

        return Promise.reject(error)
    }
)

export default request
