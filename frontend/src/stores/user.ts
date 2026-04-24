import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '../router'
import { loginUser, emailLoginUser } from '../api'
import { ElMessage } from 'element-plus'

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

    //持久化Token和用户信息
    function persistAuth(access: string, refresh: string, user: userInfo) {
        accessToken.value = access
        refreshToken.value = refresh
        userInfo.value = user
        localStorage.setItem("accessToken", access)
        localStorage.setItem("refreshToken", refresh)
        localStorage.setItem("userInfo", JSON.stringify(user))
    }

    //登录
    async function login(username: string, password: string) {
        const res = await loginUser({ username, password })
        if (res.code === 200) {
            const { accessToken: access, refreshToken: refresh, user } = res.data
            persistAuth(access, refresh, user)

            ElMessage.success('登录成功')
            router.push('/')
        } else {
            ElMessage.error(res.msg)
        }
    }

    //邮箱登录
    async function emailLogin(email: string, code: string) {
        const res = await emailLoginUser({ email, code })
        if (res.code === 200) {
            const { accessToken: access, refreshToken: refresh, user } = res.data
            persistAuth(access, refresh, user)
            ElMessage.success('登录成功')
            router.push('/')
        } else {
            ElMessage.error(res.msg)
        }
    }


    // 登出
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



    return {accessToken,refreshToken,userInfo,login,logout,emailLogin}


})
