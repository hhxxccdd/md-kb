import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '../router'
import { loginUser, emailLoginUser } from '../api'
import { ApiCode } from '../type/api'

interface userInfo {
    id: number
    username: string
    email: string
    avatar: string
}

export const useAuthStore = defineStore('auth', () => {

    const accessToken = ref<string | null>(localStorage.getItem("accessToken"))
    const refreshToken = ref<string | null>(localStorage.getItem("refreshToken"))
    const stored = localStorage.getItem("userInfo")
    const userInfo = ref<userInfo | null>(stored && stored !== 'undefined' ? JSON.parse(stored) : null)

    function persistAuth(access: string, refresh: string, user: userInfo) {
        accessToken.value = access
        refreshToken.value = refresh
        userInfo.value = user
        localStorage.setItem("accessToken", access)
        localStorage.setItem("refreshToken", refresh)
        localStorage.setItem("userInfo", JSON.stringify(user))
    }

    async function login(username: string, password: string) {
        try {
            const res = await loginUser({ username, password })
            if (res.code === ApiCode.Success) {
                const { accessToken: access, refreshToken: refresh, user } = res.data
                persistAuth(access, refresh, user)

                ElMessage.success('登录成功')
                router.push('/')
            } else {
                ElMessage.error(res.msg)
            }
        } catch {
            // request 拦截器已经统一提示错误，这里只负责吞掉已处理的业务失败。
        }
    }

    async function emailLogin(email: string, code: string) {
        try {
            const res = await emailLoginUser({ email, code })
            if (res.code === ApiCode.Success) {
                const { accessToken: access, refreshToken: refresh, user } = res.data
                persistAuth(access, refresh, user)
                ElMessage.success('登录成功')
                router.push('/')
            } else {
                ElMessage.error(res.msg)
            }
        } catch {
            // request 拦截器已经统一提示错误，这里只负责吞掉已处理的业务失败。
        }
    }

    function logout(showMessage = true) {
        accessToken.value = null
        refreshToken.value = null
        userInfo.value = null
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userInfo')
        if (showMessage) ElMessage.info('已退出登录')
        router.push('/login')
    }

    return { accessToken, refreshToken, userInfo, login, logout, emailLogin }
})
