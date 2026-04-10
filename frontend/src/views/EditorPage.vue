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
                    <!-- 'polish' | 'translate' | 'toc' | 'codeOpt' | 'qa' -->
                    <el-button type="primary" @click="openAiModal('polish')" dashed>AI润色</el-button>
                    <el-button type="primary" @click="openAiModal('translate')" dashed>AI翻译</el-button>
                    <el-button type="primary" @click="openAiModal('answerDoc')" dashed>文档问答</el-button>
                    <el-button type="primary"  @click="exportMarkdown" dashed>导出</el-button>
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
            <MyMdEditor ref="myMdEditorRef" :id="id" @update:title="title = $event" @update:status="status = $event"
                theme="light" @update:editor-content="editorContent = $event">
            </MyMdEditor>
        </div>
        <div>
            <!-- AI弹窗 -->
            <AiModel v-model:visible="modalVisible" :mode="aiMode" :text="selectedText" @replace="replace"
                :documentContext="editorContent" />
        </div>
    </div>

</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import MyMdEditor from '../component/editor/MyMdEditor.vue';
//引入elementplus图标样式
import { Back } from '@element-plus/icons-vue'
import AiModel from '../component/ai/AiModel.vue';

const id = 1
const title = ref<string>('')
const status = ref<string>('')
const editorContent = ref<string>('')

const state = reactive({
    circleUrl:
        'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg',
})

//获取封装组件myMdEditor实例
const myMdEditorRef = ref<typeof MyMdEditor>()

//AI弹窗实例
const modalVisible = ref<boolean>(false)
const aiMode = ref<'polish' | 'translate'   | 'answerDoc'>('polish')
const selectedText = ref<string>('')


// ======================================
// 按钮点击：获取选中文字（调用暴露的方法）
// ======================================
const openAiModal = (mode: 'polish' | 'translate'  | 'answerDoc') => {
    if (!myMdEditorRef.value) return
    // ✅ 获取选中文本（从你的封装组件里拿）
    selectedText.value = myMdEditorRef.value?.getSelectedText()
    if (!selectedText.value.trim() && mode !== 'answerDoc') {
        alert('请先选中文本')
        return
    }
    aiMode.value = mode
    modalVisible.value = true
    // myMdEditorRef.value?.replaceSelection('我是Hhxc')
}

//替换ai内容
const replace = (val: string) => {

    myMdEditorRef.value?.replaceSelection(val)

}


/**
 * 导出MD文件的核心方法
 */
const exportMarkdown = () => {
    // 1. 校验空内容
    if (!editorContent.value.trim()) {
        alert('请输入内容后再导出！')
        return
    }

    // 2. 创建文件对象（指定编码和MIME类型，防止乱码）
    const blob = new Blob([editorContent.value], {
        type: 'text/markdown;charset=utf-8'
    })

    // 3. 生成临时下载链接
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    // 4. 配置下载参数（自定义文件名：时间戳+md后缀，避免重名）
    link.href = downloadUrl
    link.download = `markdown_${new Date().getTime()}.md`

    // 5. 触发下载并清理临时元素
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)
}


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
    cursor: pointer;
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
