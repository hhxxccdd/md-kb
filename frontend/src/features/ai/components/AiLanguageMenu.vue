<template>
  <Teleport to="body">
    <Transition name="ai-language">
      <div
        v-if="visible"
        class="ai-language-menu"
        :style="positionStyle"
        @mousedown.prevent
      >
        <p class="ai-language-menu__title">翻译为</p>

        <button
          v-for="language in TRANSLATION_LANGUAGES"
          :key="language.value"
          type="button"
          class="ai-language-menu__option"
          @click="emit('select', language.value)"
        >
          {{ language.label }}
        </button>

        <button
          type="button"
          class="ai-language-menu__close"
          @click="emit('close')"
        >
          取消
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TRANSLATION_LANGUAGES } from '../config/aiFeatures'

const props = defineProps<{
  visible: boolean
  position: { top: number; left: number } | undefined
}>()

const emit = defineEmits<{
  select: [language: string]
  close: []
}>()

const positionStyle = computed(() => {
  if (!props.position) return {}

  return {
    top: `${Math.max(8, props.position.top + 16)}px`,
    left: `${Math.max(8, props.position.left)}px`,
  }
})
</script>

<style scoped>
.ai-language-menu {
  position: fixed;
  z-index: 1001;
  display: grid;
  min-width: 144px;
  padding: 8px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 22px rgb(15 23 42 / 16%);
}

.ai-language-menu__title {
  margin: 4px 6px 6px;
  color: #64748b;
  font-size: 12px;
}

.ai-language-menu__option,
.ai-language-menu__close {
  border: 0;
  border-radius: 5px;
  background: transparent;
  padding: 7px 8px;
  text-align: left;
  color: #334155;
  cursor: pointer;
}

.ai-language-menu__option:hover {
  background: #eff6ff;
  color: #2563eb;
}

.ai-language-menu__close {
  margin-top: 4px;
  border-top: 1px solid #e2e8f0;
  color: #64748b;
}

.ai-language-enter-active,
.ai-language-leave-active {
  transition: opacity 0.15s ease;
}

.ai-language-enter-from,
.ai-language-leave-to {
  opacity: 0;
}
</style>