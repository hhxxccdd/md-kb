import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '../router'
import { loginUser } from '../api'
import { ElMessage } from 'element-plus'

interface userInfo {
    id: number
    username: string
    email: string
    avatar: string
}

export const useAuthStore = defineStore('auth', () => {

    const accessToken = ref<string | null>('localStorage.getItem("accessToken")')
    const refreshToken = ref<string | null>('localStorage.getItem("refreshToken")')
    const stored = localStorage.getItem("userInfo")
    const userInfo = ref<userInfo | null>(stored ? JSON.parse(stored) : null)

    //持久化Token和用户信息
    function persistAuth(accessToken: string, refreshToken: string, userInfo: userInfo) {
        localStorage.setItem("accessToken", accessToken)
        localStorage.setItem("refreshToken", refreshToken)
        localStorage.setItem("userInfo", JSON.stringify(userInfo))
    }

    //登录
    async function login(username: string, password: string) {


        const res = await loginUser({ username, password })
        console.log(res)
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



    return {accessToken,refreshToken,userInfo,login,logout}


})
