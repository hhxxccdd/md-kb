<template>
  <div v-if="visible" class="ai-modal-overlay">
    <div class="ai-modal-content">
      <div class="modal-header">
        <h3>{{ mode === 'polish' ? '✨ AI 润色结果' : '🌐 AI 翻译结果' }}</h3>
        <el-icon class="close-icon" @click="closeModal" size="20">
         
        </el-icon>
      </div>

      <div class="result-box">
        {{ aiResult || 'AI 正在处理中，请稍候...' }}
      </div>

      <div class="modal-buttons">
        <el-button @click="closeModal" variant="text" text-color="#adb5bd">取消</el-button>
        <el-button type="primary" @click="confirmReplace">替换原文</el-button>
      </div>
    </div>
  </div>
</template>

<!-- AiModel.vue 适配深色编辑器版 -->
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  mode: 'polish' | 'translate'
  text: string
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  'replace': [result: string]
}>()

const aiResult = ref('')

watch(() => props.visible, (val) => {
  if (val) {
    aiResult.value = ''

    // 这里写你的AI流式请求逻辑
    fetchStream()
  }
})

//流式请求实现
const fetchStream = async () => {
    //发送get请求
    const response = await fetch('http://localhost:3000/api/ai/polish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        params:{
           content:props.text
        }
      })
    })

    let reader = response.body?.getReader()
    if (!reader) throw new Error('浏览器不支持流式读取')

    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let isFlowDone = false

    while (true) {
      
        if (isFlowDone) break
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        const events = chunk.split('\n\n')
        buffer = events.pop() || ''

        //对events进行处理
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
            const data = JSON.parse(dataJsonStr)
            if (data.status === 'done') {
              isFlowDone = true // 🔥 设置结束标志
              break
            }
            if(data.content){
              aiResult.value += data.content
            }
          }
    }
}



const closeModal = () => {
  emit('update:visible', false)
}

const confirmReplace = () => {
  emit('replace', aiResult.value)
  closeModal()
}
</script>
<style scoped>
/* 遮罩层：半透明深色，和编辑器背景融合 */
.ai-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  /* 更深的遮罩，突出弹窗 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* 弹窗容器：深色背景 + 白色文字，完全匹配编辑器 */
.ai-modal-content {
  width: 520px;
  background: #1e1e1e;
  /* 编辑器同款深色背景 */
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  color: #e9ecef;
  /* 浅色文字，和编辑器一致 */
}

/* 弹窗头部：标题 + 关闭按钮 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff
}

.close-icon {
  cursor: pointer;
  color: #adb5bd;
  transition: color 0.2s;
}

.close-icon:hover {
  color: #ffffff;
}

/* 结果展示区：稍浅的深色背景，提升可读性 */
.result-box {
  min-height: 140px;
  padding: 14px;
  background: #2d2d2d;
  border-radius: 6px;
  margin: 12px 0;
  white-space: pre-wrap;
  line-height: 1.6;
  color: #e9ecef;
  border: 1px solid #3a3a3a;
}

/* 按钮组：适配深色主题 */
.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

/* 覆盖Element Plus按钮默认样式，适配深色 */
:deep(.el-button--primary) {
  background-color: #409eff;
  border-color: #409eff;
}

:deep(.el-button--default) {
  color: #e9ecef;
  border-color: #444;
  background-color: transparent;
}

:deep(.el-button--default:hover) {
  color: #ffffff;
  border-color: #666;
  background-color: #333;
}
</style>