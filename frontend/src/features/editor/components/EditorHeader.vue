<template>
  <header class="editor-header">
    <div class="editor-header-left">
      <button
        class="editor-header-back"
        type="button"
        aria-label="返回文档列表"
        @click="emit('back')"
      >
        <el-icon size="24"> <Back /> </el-icon>
      </button>

      <p class="editor-header-title">{{ title }}</p>

      <span class="editor-header-status"> {{ status }} </span>
    </div>

    <div class="editor-header-right">
      <el-button
        text
        :loading="qualityChecking"
        :disabled="!canCheckQuality"
        @click="emit('quality-check')"
      >
        <el-icon><CircleCheck /></el-icon>
        <span>质量检查</span>
      </el-button>

      <el-button text class="export-button" @click="emit('export')">
        <el-icon><Download /></el-icon>
        <span>导出</span>
      </el-button>

      <div class="header-divider" aria-hidden="true"></div>

      <div class="editor-header-collaboration">
        <div class="online-users">
          <el-avatar
            v-for="user in onlineUsers"
            :key="user.id"
            :size="30"
            :src="user.avatar || undefined"
            :title="user.username"
          >
            {{ user.username.slice(0, 1) }}
          </el-avatar>
        </div>

        <el-button v-if="canInvite" type="primary" @click="emit('invite')">
          邀请协作
        </el-button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Back, Download, CircleCheck } from "@element-plus/icons-vue";
import type { OnlineUser } from "../../collaboration/types/collaboration";

defineProps<{
  title: string;
  status: string;
  onlineUsers: OnlineUser[];
  canInvite: boolean;
  qualityChecking:boolean;
  canCheckQuality: boolean;
}>();

const emit = defineEmits<{
  back: [];
  export: [];
  invite: [];
  "quality-check": [];
}>();
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
  gap: 10px;
  padding-right: 20px;
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
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: normal;
  color: #64748b;
  opacity: 0.8;
  text-shadow: 0 0 1px rgba(100, 116, 139, 0.3);
}

.export-button {
  height: 34px;
  padding: 0 10px;
  color: #475569;
}

.header-divider {
  width: 1px;
  height: 22px;
  margin: 0 4px;
  background: #e5e7eb;
}

.editor-header-collaboration {
  display: flex;
  align-items: center;
  gap: 10px;
}

.online-users {
  display: flex;
  align-items: center;
}

.online-users :deep(.el-avatar + .el-avatar) {
  margin-left: -8px;
}

.online-users :deep(.el-avatar) {
  border: 2px solid #ffffff !important;
}
</style>
