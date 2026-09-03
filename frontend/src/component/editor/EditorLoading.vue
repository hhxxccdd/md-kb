<template>
    <div class="editor-loading" role="status" aria-live="polite">
          <span class="editor-loading-spinner" ></span>
          <span>正在加载编辑器</span>
    </div>
</template>

<style scoped>
.editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  color: #64748b;
}

.editor-loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #dbeafe;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: editor-loading-spin 0.8s linear infinite;
}

@keyframes editor-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>