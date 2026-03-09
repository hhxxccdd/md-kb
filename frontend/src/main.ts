import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// 1. 引入 Element Plus 核心
import ElementPlus from 'element-plus'
// 2. 引入 Element Plus 全局样式（必须！）
import 'element-plus/dist/index.css'

const app = createApp(App)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
