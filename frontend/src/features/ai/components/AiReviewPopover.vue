<template>
  <Teleport to="body">
    <Transition name="ai-review">
      <section
        v-if="visible && review"
        class="ai-review-toolbar"
        :style="positionStyle"
        @mousedown.prevent
      >
        <span class="ai-review-toolbar__title">
          {{ title }}
        </span>

        <span
          v-if="status === 'streaming'"
          class="ai-review-toolbar__status"
        >
          正在生成…
        </span>

        <span
          v-else-if="status === 'failed'"
          class="ai-review-toolbar__error"
        >
          {{ error?.message ?? '生成失败' }}
        </span>

        <el-button
          v-if="status === 'failed' && error?.retryable"
          size="small"
          @click="emit('retry')"
        >
          重试
        </el-button>

        <el-button
          size="small"
          @click="emit('close')"
        >
          忽略
        </el-button>

        <el-button
          type="primary"
          size="small"
          :disabled="status !== 'completed'"
          @click="emit('accept')"
        >
          采纳
        </el-button>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  AIActionError,
  AIActionStatus,
  AIReviewSession,
} from '../types/ai'

const props = defineProps<{
  visible: boolean
  review: AIReviewSession | undefined
  status: AIActionStatus
  error: AIActionError | undefined
}>()

const emit = defineEmits<{
  accept: []
  close: []
  retry: []
}>()

const title = computed(() => {
  if (props.review?.action === 'translate') {
    return `翻译为 ${props.review.targetLanguage ?? '目标语言'}`
  }

  return 'AI 润色'
})

const positionStyle = computed(() => {
  if (!props.review) return {}

  const width = 360
  const left = Math.max(
    8,
    Math.min(props.review.position.left, window.innerWidth - width - 8),
  )

  return {
    top: `${Math.max(8, props.review.position.top + 20)}px`,
    left: `${left}px`,
  }
})
</script>

<style scoped>
.ai-review-toolbar {
  position: fixed;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 16px);
  padding: 8px 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 22px rgb(15 23 42 / 16%);
}

.ai-review-toolbar__title {
  color: #1e293b;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.ai-review-toolbar__status {
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}

.ai-review-toolbar__error {
  max-width: 160px;
  overflow: hidden;
  color: #dc2626;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-review-enter-active,
.ai-review-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.ai-review-enter-from,
.ai-review-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
