<template>
    <header class="editor-header">
        <div class="editor-header-left">
             <button class="editor-header-back" type="button" aria-label="返回文档列表" @click="emit('back')"> <el-icon size="24"> <Back /> </el-icon>  </button>

             <p class="editor-header-title"> {{ title }} </p>

             <span class="editor-header-status"> {{ status }} </span>
        </div>

        <div class="editor-header-right">
            <div class="editor-header-actions">
                <el-button type="primary" dashed @click="emit('ai-action','polish')">AI润色</el-button>
                <el-button type="primary" dashed @click="emit('ai-action','translate')">AI翻译</el-button>
                <el-button type="primary" dashed @click="emit('ai-action','answerDoc')">文档问答</el-button>
                <el-button type="primary" dashed @click="emit('export')">导出</el-button>
            </div>

            <div class="editor-header-collaboration">
                <el-avatar v-for="user in onlineUsers" :key="user.id" :size="28" :src="user.avatar || undefined" :title="user.username">{{ user.username.slice(0,1) }}</el-avatar>
                <el-button v-if="canInvite" type="primary" @click="emit('invite')">邀请协作</el-button>
           </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { Back } from '@element-plus/icons-vue';
import type { OnlineUser } from '../../type/collab';

defineProps<{
    title: string
    status:string
    onlineUsers:OnlineUser[]
    canInvite:boolean
}>()

const emit = defineEmits<{
    back:[]
    'ai-action':[mode: 'polish' | 'translate' | 'answerDoc']
    export: []
    invite: []
}>()


</script>

<style scoped>
.editor-header {
  width: 100%;
  height: 50px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.editor-header-left,
.editor-header-right {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.editor-header-right {
  justify-content: flex-end;
}

.editor-header-back {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 15px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.editor-header-title {
  margin: 0 0 0 20px;
  font-size: larger;
}

.editor-header-status {
  margin-left: 70px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 15px;
  font-weight: normal;
  color: #64748b;
  opacity: 0.8;
  text-shadow: 0 0 1px rgba(100, 116, 139, 0.3);
}

.editor-header-actions,
.editor-header-collaboration {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-header-collaboration {
  margin-left: auto;
  padding-right: 24px;
}

:deep(.el-avatar) {
  border: 2px solid #ffffff !important;
}
</style>