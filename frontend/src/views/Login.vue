<template>

    <div class="login-page">

        <!-- 左侧品牌区 -->
        <div class="brand-section">
            <h1 class="brand-title">AI 增强知识库</h1>
            <p class="brand-desc">Markdown 编辑 . AI智能问答 . 团队协作</p>
            <div class="brand-feature">
                <div class="feature-item">✦ 原生 Markdown 编辑体验</div>
                <div class="feature-item">✦ 带上下文记忆的文档智能问答</div>
                <div class="feature-item">✦ 私有/公开文档权限管理</div>
            </div>
        </div>

        <!-- 右侧表单区 -->
        <div class="form-card">
            <div class="form-tab">
                <div @click="mode = 'login'" :class="['tab-item', { active: mode === 'login' }]">登录</div>
                <div @click="mode = 'register'" :class="['tab-item', { active: mode === 'register' }]">注册</div>
            </div>
            <div class="loginContainer" v-show="mode === 'login'">
                <div class="login-type-switch">
                    <div @click="loginMode = 'password'"
                        :class="['login-type-item ', { active: loginMode === 'password' }]">密码登录</div>
                    <div @click="loginMode = 'verifycode'"
                        :class="['login-type-item ', { active: loginMode === 'verifycode' }]">验证码登录</div>
                </div>

                <form class="form-content" v-show="loginMode === 'password'">
                    <div class="form-item">
                        <label class="form-label">用户名</label>
                        <input type="text" v-model="username" class="form-input" placeholder="请输入用户名" required>
                    </div>
                    <div class="form-item">
                        <label class="form-label">密码</label>
                        <input type="text" v-model="password" class="form-input" placeholder="密码" required>
                    </div>
                    <button type="submit" class="btn-primary">登录</button>
                </form>

                <form class="form-content" v-show="loginMode === 'verifycode'">
                    <div class="form-item">
                        <label class="form-label">邮箱</label>
                        <input type="email" class="form-input" placeholder="请输入邮箱" required />
                    </div>
                    <div class="form-item">
                        <label class="form-label">验证码</label>
                        <div class="form-item-row">
                            <input type="text" class="form-input" placeholder="请输入验证码" required />
                            <button :disabled="countdown > 0" type="button" class="btn-code" @click="getCode">
                                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                            </button>
                        </div>
                    </div>

                    <button type="submit" class="btn-primary">登录</button>
                </form>

            </div>

            <!-- 注册表单 -->
            <form class="form-content" v-show="mode === 'register'">
                <div class="form-item">
                    <label class="form-label">用户名</label>
                    <input type="text" class="form-input" v-model="username" placeholder="请设置用户名" required />
                </div>
                <div class="form-item">
                    <label class="form-label">邮箱</label>
                    <input type="email" class="form-input" v-model="email" placeholder="请输入邮箱" required />
                </div>
                <div class="form-item">
                    <label class="form-label">密码</label>
                    <input type="password" class="form-input" v-model="password" placeholder="请设置密码" required />
                </div>
                <button type="button" class="btn-primary" @click="register">注册</button>
            </form>
        </div>



    </div>




</template>

<script setup lang="ts">
import { ref } from 'vue'
import { registerUser, loginUser } from '../api/user'
import { ElMessage } from 'element-plus'

//切换登录，注册
const mode = ref<string>('login')
//切换密码，验证码
const loginMode = ref<string>('password')
//验证码倒计时
const countdown = ref<number>(0)
// 定时器实例
let timer: ReturnType<typeof setInterval> | null = null

// 登录表单数据
const username = ref<string>('')
const password = ref<string>('')
// 注册表单数据
const email = ref<string>('')


//还没有清除定时器，注意最后清除定时器
const getCode = () => {
    if (countdown.value > 0) return

    // 模拟发送验证码
    console.log('发送验证码...')

    countdown.value = 60
    timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0 && timer) {
            clearInterval(timer)
            timer = null
        }
    }, 1000)
}

//注册
const register = async () => {
    const data = {
        username: username.value,
        password: password.value,
        email: email.value
    }
    const res = await registerUser(data)
    console.log(res)
    if (res.code === 200) {
        ElMessage.success('注册成功')
        mode.value = 'login'
    } else {
        ElMessage.error(res.msg)
    }
}








</script>

<style scoped>
.login-page {
    height: 100vh;
    width: 100vw;
    background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 120px;
    padding: 0 40px;
}

.brand-section {
    max-width: 500px;
}

.brand-title {
    font-size: 42px;
    font-family: 700;
    color: #1d2129;
    margin: 0 0 16px 0;
    line-height: 1.2;
}

.brand-desc {
    font-size: 18px;
    color: #4e5969;
    margin: 0 0 40px 0;
    line-height: 1.5;
}

.brand-feature {
    display: flex;
    flex-direction: column;
    gap: 16px
}

.feature-item {
    font-size: 16px;
    color: #1d2129;
    line-height: 1.5;
}

.form-card {
    width: 400px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    padding: 32px;
}

.form-tab {
    display: flex;
    border-bottom: 1px solid #e5e6eb;
    margin-bottom: 32px;
}

.tab-item {
    flex: 1;
    text-align: center;
    padding-bottom: 12px;
    font-size: 16px;
    font-weight: 500;
    color: #86909c;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
}

.tab-item.active {
    color: #1677ff;
    border-color: #1677ff;
}

.login-type-switch {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
}

.login-type-item {
    font-size: 14px;
    color: #4e5969;
    cursor: pointer;
    padding-bottom: 4px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
}

.login-type-item.active {
    color: #1677ff;
    border-color: #1677ff;
}

.form-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-item-row {
    display: flex;
    gap: 12px;
}

.form-item-row .form-input {
    flex: 1;
}

.form-label {
    font-size: 14px;
    font-weight: 500;
    color: #1d2129;
}

.form-input {
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    font-size: 14px;
    color: #1d2129;
    transition: all 0.2s;
    background: #ffffff;
}

.form-input:focus {
    outline: none;
    border-color: #1677ff;
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.form-input::placeholder {
    color: #86909c;
}

/* 验证码按钮 */
.btn-code {
    height: 44px;
    padding: 0 16px;
    background: #f5f7fa;
    color: #1677ff;
    border: 1px solid #1677ff;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-code:hover:not(:disabled) {
    background: #e6f7ff;
}

.btn-code:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #f5f7fa;
    color: #86909c;
    border-color: #e5e6eb;
}


/* 按钮 - 和编辑页顶部按钮完全一致 */
.btn-primary {
    width: 100%;
    height: 44px;
    background: #1677ff;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 8px;
}

.btn-primary:hover:not(:disabled) {
    background: #40a9ff;
}

.btn-primary:active:not(:disabled) {
    background: #0958d9;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}


/* 响应式适配 */
@media (max-width: 1000px) {
    .login-page {
        flex-direction: column;
        gap: 40px;
        padding: 40px 20px;
    }

    .brand-section {
        text-align: center;
    }

    .brand-title {
        font-size: 32px;
    }

    .form-card {
        width: 100%;
        max-width: 400px;
    }
}
</style>