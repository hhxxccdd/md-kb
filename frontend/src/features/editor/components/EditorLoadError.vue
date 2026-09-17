<template>
  <div
    class="editor-load-error"
    role="alert"
  >
    <p>编辑器加载失败，请检查网络后刷新页面重试。</p>

    <button
      class="editor-load-error-button"
      type="button"
      @click="reloadPage"
    >
      刷新页面
    </button>
  </div>
</template>

<script setup lang="ts">
const reloadPage = () => {
  window.location.reload()
}
</script>

<style scoped>
.editor-load-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  height: 100%;
  color: #64748b;
}

.editor-load-error p {
  margin: 0;
}

.editor-load-error-button {
  padding: 8px 14px;
  border: 0;
  border-radius: 4px;
  color: #ffffff;
  background: #409eff;
  cursor: pointer;
}
</style>