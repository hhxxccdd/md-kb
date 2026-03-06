<template>
   <div class="editor-container">
      <h1>Markdown编辑器测试</h1>
      <!-- 在模板中使用组件，用v-model绑定内容 -->
      <MdEditor v-model="mdContent" style="height: 500px;"></MdEditor>
   </div>

</template>

<script setup lang="ts">
import {ref} from 'vue'
//引入编辑器组件
import { MdEditor } from 'md-editor-v3';
//引入编辑器样式
import 'md-editor-v3/lib/style.css';


const mdContent = ref('# Hello, md-editor-v3! \n在这里输入你的 Markdown 内容...')
</script>

<style scoped>
.editor-container{
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
