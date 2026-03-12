<template>
    <div class="editor">
        <div class="editor-head">
            <div class="editor-head-left">
                <div class="back">
                    <el-icon size="24">
                        <Back />
                    </el-icon>
                </div>

                <div class="editor-head-text">
                    <p> {{ title }}</p>
                </div>

                <div class="editor-head-status"> {{ status }} </div>
            </div>

            <div class="editor-head-right">

                <div class="editor-head-right-ai">
                    <el-button type="primary" dashed>AI润色</el-button>
                    <el-button type="primary" dashed>生成目录</el-button>
                    <el-button type="primary" dashed>代码优化</el-button>
                    <el-button type="primary" dashed>导出</el-button>
                </div>
                <div class="editor-head-right-func">

                    <div class="avatar">

                        <div class="avatar-1">
                            <el-avatar :size="30" :src="state.circleUrl" />
                        </div>
                        <div class="avatar-2">
                            <el-avatar :size="30" :src="state.circleUrl" />
                        </div>
                    </div>

                    <div class="share">
                        <el-button type="primary">分享</el-button>
                    </div>

                </div>

            </div>

        </div>
        <div class="editor-container">
            <!-- 在模板中使用组件，用v-model绑定内容 -->
            <MdEditor v-model="mdContent" style="height: 100%;"></MdEditor>
        </div>
    </div>

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
//引入编辑器组件
import { MdEditor } from 'md-editor-v3';
//引入编辑器样式
import 'md-editor-v3/lib/style.css';
//引入elementplus图标样式
import { Back } from '@element-plus/icons-vue'
import request from '../utils/request';
import { useRouter } from 'vue-router';


const router = useRouter()
const mdContent = ref('')
const title = ref('')
const status = ref('已保存')
const id = 1

// 用于对比的原始数据（从服务器获取的最新数据）
const originalContent = ref('')
const originalTitle = ref('')
const state = reactive({
    circleUrl:
        'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg',
})

if (id) {
    onMounted(async () => {
        const res = await request.get(`/doc/${id}`)
        console.log(res)
        title.value = res.data.title
        mdContent.value = res.data.content
        // 保存原始数据用于对比
        originalTitle.value = res.data.title
        originalContent.value = res.data.content
    })
}

//添加防抖处理
const debounce = (fn: Function, delay: number = 300): Function => {
    let timer: any = null
    return (...args: any[]) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
            fn(...args)
        }, delay) //300ms才解析
    }
}

//解析函数，第一行直接变标题
const parseMarkdown = (text: string) => {
    if (!text) {
        title.value = ''
        return
    }
    const lines = text.split('\n')
    const firstLine = lines[0]
    if (firstLine?.startsWith('# ')) {
        title.value = firstLine.slice(2) ?? ''
    }else{
        title.value = firstLine || ''
    }

}

//自动保存
const handleChange = async () => {

    status.value = '未保存'
    if (id) {
        await request.post(`/doc/${id}`, {
            title: title.value,
            content: mdContent.value
        })
       
    }else {
        const res = await request.post('/doc', {
            title:title.value || '未命名文档',
            content:mdContent.value
        })
        router.push(`/edito/${res.data.id}`)
    }
    status.value = '已保存'
}

const debounceParse = debounce(parseMarkdown, 300)
const debounceHandle = debounce(handleChange,800)

watch(mdContent, (newVal) => {
    status.value = '未保存'
    debounceParse(newVal)
    debounceHandle(newVal)
})






</script>

<style scoped>
.editor {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

.editor-head-status {
    /* 字体：系统默认无衬线体，和你页面风格统一 */
    font-family: system-ui, -apple-system, sans-serif;
    /* 字号：中等偏小，和标题区分开 */
    font-size: 15px;
    /* 字重：常规，不加粗 */
    font-weight: normal;
    /* 颜色：偏灰的蓝色，还原图中淡感 */
    color: #64748b;
    /* 接近 slate-500，和图中色调一致 */
    /* 轻微模糊/淡感：可选，模拟图中“发虚”效果 */
    opacity: 0.8;
    /* 如果你想更贴近图中的模糊感，可以加一行 text-shadow */
    text-shadow: 0 0 1px rgba(100, 116, 139, 0.3);
    margin-left: 70px;
}

.editor-head {
    width: 100%;
    height: 50px;
    display: flex;
    align-items: center;
}

.editor-head-left {
    display: flex;
    align-items: center;
    flex: 1;
}

.share {
    margin-right: 20px;
}

.avatar-1 {
    z-index: 1;
}

.avatar-2 {
    z-index: 2;
    margin-left: -12px;
}

:deep(.el-avatar) {
    border: 2px solid #ffffff !important;
}

.avatar {
    display: flex;
    margin-right: 30px;
}

.editor-head-right-func {
    display: flex;
    align-items: center;
}

.editor-head-right {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: space-between;
}

.editor-head-right-ai {
    display: flex;
}



.editor-head .back {
    margin-left: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.editor-head-text {
    margin-left: 20px;
    font-size: larger;
}

.editor-head-text p {
    margin: 0;
    padding: 0;
}


.editor-container {
    height: calc(100% - 50px);
    width: 100%;
}
</style>
