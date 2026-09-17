<template>
     <Teleport to="body">
        <Transition name="ai-hint">
             <div v-if="hint" class="ai-inline-hint" :style="positionStyle" @mousedown.prevent>

                  <span class="ai-inline-hint-label">✨ AI</span>

                  <button type="button" class="ai-inline-hint-action" @click="emit('action','polish')">润色</button>
  
                  <button type="button" class="ai-inline-hint-action" @click="emit('action','translate')">翻译</button>

                  <button type="button" class="ai-inline-hint-dismiss" aria-label="关闭AI建议" @click="emit('dismiss')">×</button>
             </div>
        </Transition>
     </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AIActionType,AISelectionHint } from '../types/ai';


const props = defineProps<{
    hint:AISelectionHint | undefined
}>()

const emit = defineEmits<{
    action:[type:AIActionType]
    dismiss:[]
}>()

const positionStyle = computed(() => {
    if(!props.hint)  return {}

    const maxLeft = window.innerWidth - 200

    return {
        top: `${props.hint.position.top}px`,
        left:`${Math.max(8,Math.min(props.hint.position.left,maxLeft))}px`
    }
})

</script>

<style scoped>
.ai-inline-hint {
  position: fixed;
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: calc(100vw - 16px);
  padding: 6px 8px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgb(15 23 42 / 14%);
  transform: translateY(-100%);
}

.ai-inline-hint-label {
  color: #475569;
  font-size: 12px;
  white-space: nowrap;
}

.ai-inline-hint-action,
.ai-inline-hint-dismiss {
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  font-size: 12px;
  line-height: 24px;
}

.ai-inline-hint-action {
  padding: 0 6px;
}

.ai-inline-hint-action:hover {
  background: #eff6ff;
}

.ai-inline-hint-dismiss {
  width: 24px;
  padding: 0;
  color: #64748b;
}

.ai-inline-hint-dismiss:hover {
  background: #f1f5f9;
}

.ai-hint-enter-active,
.ai-hint-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.ai-hint-enter-from,
.ai-hint-leave-to {
  opacity: 0;
  transform: translateY(calc(-100% + 4px));
}

</style>