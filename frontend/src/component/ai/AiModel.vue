<template>
  <div v-if="visible" class="ai-modal-overlay">
    <div class="ai-modal-content">
      <div class="modal-header">
        <h3>{{ featureConfig.title }}</h3>
        <el-icon class="close-icon" @click="closeModal" size="20">
          <Close />
        </el-icon>
      </div>

      <!-- 👇 文档问答：专属对话框 -->
      <div v-if="mode === 'answerDoc'" class="qa-box">
        <div class="chat-list" style="white-space: pre-wrap" ref="chatListRef">
          <div v-for="(item, i) in chatList" :key="i" class="chat-item">
            <div class="user" v-if="item.role === 'user'">我：{{ item.content }}</div>
            <div class="ai" v-else>AI：{{ item.content }}</div>
          </div>
          <div v-if="loading" class="loading">AI 思考中...</div>
        </div>
        <div class="chat-input">
          <el-input v-model="question" placeholder="输入问题..." @keydown.enter="sendQuestion" />
          <el-button type="primary" @click="sendQuestion" :disabled="loading">发送</el-button>
        </div>
      </div>

      <!-- 👇 润色/翻译 普通结果展示 -->
      <div v-else class="result-box">
        {{ aiResult || 'AI 正在处理中，请稍候...' }}
      </div>

      <!-- 👇 按钮区域：按需显示 -->
      <div class="modal-buttons">
        <!-- 仅非问答功能显示：替换原文 -->
        <el-button v-if="mode !== 'answerDoc' && mode !== 'translate'" type="primary" @click="confirmReplace">
          替换原文
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
//  直接导入 aiStream
import { aiStream } from '../../utils/aiStream'
//  导入AiModel配置文件
import { AI_FEATURES } from '../../config/aiFeature'
import type { AIFeatureConfig } from '../../type/ai';
import { Close } from '@element-plus/icons-vue';
//导入支持上下文请求
import { getSessionId, getContext, saveMessage } from '../../api'
import type { ChatMessage } from '../../type/chat';

//模拟user_id 和 doc_id
const userId = ref<number>(1)
const docId = ref<number>(1)

const props = defineProps<{
  visible: boolean
  mode: 'polish' | 'translate' | 'answerDoc'
  text: string
  documentContext?: string
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  'replace': [result: string]
}>()

//换为响应式，mode一变换便重新加载
const featureConfig = computed<AIFeatureConfig>(() => {
  const config = AI_FEATURES[props.mode]
  if (!config) {
    throw new Error(`未找到 mode: ${props.mode} 对应的配置`)
  }
  return config
})
const aiResult = ref('')
const loading = ref(false)

// 文档问答专用状态
const chatList = ref<{ role: 'user' | 'ai'; content: string }[]>([])
const question = ref('')
const chatListRef = ref<HTMLDivElement | null>(null)
const session_id = ref<string>()

// 监听弹窗打开
watch(() => props.visible, async (val) => {
  if (val) {
    // 重置状态
    aiResult.value = ''
    loading.value = false
    chatList.value = []
    question.value = ''
    //翻译功能，自动执行
    if (props.mode === 'translate') {
      handleCommonFeature("English")
    }
    // 非问答功能：自动执行
    if (props.mode === 'polish') {
      handleCommonFeature()
    }
    //问答功能
    if (props.mode === 'answerDoc') {
      //获取上下文id
      const params = { user_id: userId.value, doc_id: docId.value }
      const sessionId = await getSessionId(params)
      session_id.value = sessionId.data
      //获取上下文
      const list: ChatMessage[] = (await getContext(session_id.value)).data
      chatList.value = list
    }
  }
})

// ==============================================
// 👇 严格调用你封装的 aiStream，处理普通功能
// ==============================================
const handleCommonFeature = async (Lang?: string) => {
  loading.value = true
  await aiStream(
    featureConfig.value.url,
    {
      content: props.text,
      targetLang: Lang
    },
    (data) => {
      if (data.status === 'loading' && data.content) {
        aiResult.value += data.content
      }
    }
  )
  loading.value = false
}

// ==============================================
// 👇 严格调用你封装的 aiStream，处理文档问答
// ==============================================
const sendQuestion = async () => {
  if (!question.value.trim()) return
  const userMsg = question.value
  chatList.value.push({ role: 'user', content: userMsg })
  chatList.value.push({ role: 'ai', content: 'AI思考中' })  //用来做占位符
  question.value = ''

  let message = {
    session_id: session_id.value as string,
    role: 'user',
    content: userMsg
  }

  //保存AI聊天记录
  saveMessage(message)

  
  let aiAnswer = ''
  await aiStream(
    featureConfig.value.url,
    {
      question: userMsg,
      docContent: props.documentContext || '',
      historyMessages:chatList.value

    },
    (data) => {
      if (data.status === 'loading' && data.content) {
        aiAnswer += data.content
        // 实时更新对话
        chatList.value[chatList.value.length - 1] = { role: 'ai', content: aiAnswer }
      }
    }
  )

  message = {
    session_id: session_id.value as string,
    role: 'ai',
    content: aiAnswer
  }

  saveMessage(message)


  scrollToBottom()

}


//发送消息自动跳转到尾部
const scrollToBottom = () => {
  const box = chatListRef.value
  if (!box) return
  box.scrollTop = box.scrollHeight
}

// 关闭弹窗
const closeModal = () => {
  emit('update:visible', false)
}

// 替换原文（仅普通功能）
const confirmReplace = () => {
  emit('replace', aiResult.value)
  closeModal()
}
</script>

<style scoped>
/* 你的原有样式，完全保留 + 新增问答极简样式 */
.ai-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.ai-modal-content {
  width: 550px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px 24px;
  color: #e9ecef;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #fff;
}

.close-icon {
  color: #adb5bd;
  cursor: pointer;
}

.result-box {
  min-height: 140px;
  padding: 14px;
  background: #2d2d2d;
  border-radius: 6px;
  white-space: pre-wrap;
  color: #e9ecef;
  margin: 12px 0;
}

/* 文档问答样式 */
.qa-box {
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-list {
  background: #2d2d2d;
  padding: 12px;
  border-radius: 6px;
  min-height: 200px;
  max-height: 300px;
  overflow-y: auto;
}

.chat-item {
  margin: 8px 0;
  line-height: 1.5;
}

.user {
  color: #409eff;
}

.ai {
  color: #e9ecef;
}

.loading {
  color: #409eff;
  margin-top: 8px;
}

.chat-input {
  display: flex;
  gap: 8px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

:deep(.el-button--primary) {
  background: #409eff;
  border-color: #409eff;
}
</style>