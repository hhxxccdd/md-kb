<template>
    <div style="max-width: 800px; margin: 20px auto; padding: 0 20px">
        <h3>AI 流式对话测试</h3>

        <!-- 输入框 -->
        <textarea v-model="prompt" rows="3" placeholder="请输入问题..."
            style="width: 100%; padding: 10px; margin-bottom: 10px" />

        <!-- 发送按钮 -->
        <button @click="sendRequest" :disabled="loading" style="padding: 8px 16px; cursor: pointer">
            {{ loading ? '请求中...' : '发送请求' }}
        </button>

        <!-- 实时回复区域 -->
        <div style="margin-top: 20px; padding: 15px; border: 1px solid #eee; min-height: 100px; white-space: pre-wrap">
            {{ result }}
        </div>

        <!-- 调试日志 -->
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p>调试日志：</p>
            <pre>{{ log }}</pre>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const prompt = ref('你好，请介绍一下自己')
const result = ref('')
const log = ref('')
const loading = ref(false)

const sendRequest = async () => {
    if (!prompt.value) return
    result.value = ''
    log.value = ''
    loading.value = true

    // 声明读取器，用于异常时取消
    let reader: ReadableStreamDefaultReader | undefined

    try {
        const response = await fetch('http://localhost:3000/api/ai/test-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt.value })
        })

        reader = response.body?.getReader()
        if (!reader) throw new Error('浏览器不支持流式读取')

        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let isFlowDone = false // 🔥 新增：全局结束标志

        // 核心：给 read 加容错，防止卡死
        while (true) {
            try {
                if (isFlowDone) break // 🔥 先判断是否要结束整个流
                const { done, value } = await reader.read()
                if (done) {
                    addLog('✅ 流式传输完成')
                    break
                }

                const chunk = decoder.decode(value, { stream: true })
                addLog(`📩 收到分片：\n${chunk}`)

                buffer += chunk
                const events = buffer.split('\n\n')
                buffer = events.pop() || ''

                for (const event of events) {
                    if (!event.trim()) continue
                    const lines = event.split('\n')
                    let dataJsonStr = ''
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            dataJsonStr = line.slice(5).trim()
                            break
                        }
                    }

                    if (!dataJsonStr) continue
                    try {
                        const data = JSON.parse(dataJsonStr)
                        // 🔥 新增：监听结束状态，主动退出
                        if (data.status === 'done') {
                            addLog('✅ 前端收到结束信号')
                            isFlowDone = true // 🔥 设置结束标志
                            break
                        }
                        if (data.content) {
                            result.value += data.content
                        }
                    } catch (parseErr) { }
                }
            } catch (readErr) {
                addLog(`❌ 读取流失败：${readErr}`)
                break // 读取失败，强制退出循环！
            }
        }
    } catch (err) {
        addLog(`❌ 请求错误：${(err as Error).message}`)
    } finally {
        // 🔥 现在 100% 会执行！
        loading.value = false
        addLog('🔄 已重置加载状态')
    }
}

const addLog = (text: string) => {
    log.value += `${new Date().toLocaleTimeString()}：${text}\n`
}
</script>