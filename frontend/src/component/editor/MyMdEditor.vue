<template>
    <MdEditor ref="editorRef" v-model="editorContent" :toolbars="mybars" :theme="theme" :onUploadImg="handleUploadImg"
        :preview="true" :emoji="customEmojis" style="height: 100%">
        <template #defToolbars>
            <Emoji :emojis="allEmojis">
            </Emoji>
            <ExportPDF :modelValue="editorContent" />
        </template>
    </MdEditor>

</template>


<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router';
import { MdEditor } from 'md-editor-v3';
import type { ToolbarNames } from 'md-editor-v3';
import request from '../../utils/request';
import 'md-editor-v3/lib/style.css';
import type { ExposeParam } from 'md-editor-v3';
import { Emoji, ExportPDF } from '@vavt/v3-extension'
// 只导入 Emoji 组件需要的样式
import "@vavt/v3-extension/lib/asset/Emoji.css";
import '@vavt/v3-extension/lib/asset/ExportPDF.css';

const router = useRouter()
const mybars: ToolbarNames[] = ['bold', 'code', 'image', 'mermaid', 'katex', 'fullscreen', '-', 0, 1]; // 你的固定配置
//自定义表情包
const customEmojis = [
    '🤡', '💀'
];
//官方表情包
const componentDefaultEmojis = Emoji.props.emojis.default
// 2. 合并：官方默认表情 + 你的自定义表情
const allEmojis = [...componentDefaultEmojis, ...customEmojis]

const title = ref('')
const editorContent = ref('')

//获取编辑器实例
const editorRef = ref<ExposeParam>();

//定义Props，接受父组件传值
const { id, theme } = defineProps<{
    id: string | number,
    theme?: 'light' | 'dark'
}>()

//定义Emit(向父组件传值)
const emit = defineEmits<{
    'update:title': [val: string]
    'update:status': [val: string]
    'update:editorContent': [val: string]
}>()

//将编辑器的方法暴漏给父组件
defineExpose({
    //获取选中文本
    getSelectedText: () => {
        return editorRef.value?.getSelectedText()
    },
    //替换选中文本
    replaceSelection: (replaceText: string) => {
        //获取选中的文本
        const selsctedText = editorRef.value?.getSelectedText()
        if (!selsctedText) return

        //直接替换响应式变量
        editorContent.value = editorContent.value.replace(selsctedText, replaceText)
    }
})




//防抖
const debounce = (fn: Function, delay: number) => {
    let timer: any = null
    return (...args: any[]) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

const parseMarkdown = (text: string) => {
    if (!text) {
        title.value = ''
        emit('update:title', '')
        return
    }
    const firstLine = text.split('\n')[0]
    title.value = firstLine?.startsWith('# ') ? firstLine.slice(2) : firstLine || '未命名文档'
    emit('update:title', title.value)
}

// 4. 自动保存：提交【本地存储的标题】到后端
const saveDoc = async () => {
    if (!editorContent.value) return
    try {
        if (id) {
            // ✅ 保存时提交子组件存储的 title，不再是空！
            await request.post(`/doc/${id}`, {
                title: title.value,
                content: editorContent.value
            })
        } else {
            const res = await request.post('/doc', {
                title: title.value || '未命名文档',
                content: editorContent.value
            })
            router.push(`/edito/${res.data.id}`)
        }
        emit('update:status', '已保存')
    } catch (err) {
        emit('update:status', '保存失败')
        console.error(err)
    }
}

const handleUploadImg = async (files: File[], callBack: (urls: string[]) => void) => {
    const file = files[0]
    if (!file) {
        alert('请选择有效的图片文件')
        return
    }
    const formData = new FormData()
    formData.append('image', file)
    try {
        // 发送请求
        const res = await request.post('/upload/image', formData)
        // 打印返回结果，排查问题
        const imageUrl = res.data.url
        // 传给编辑器，显示图片（直接传递字符串数组）
        callBack([imageUrl]);
    } catch (error) {
        // 捕获错误，提示用户
        alert('图片上传失败！')
        console.error('上传报错：', error)
        // 失败必须调用空回调，防止编辑器卡住
        callBack([])
    }
}

// 防抖
const debounceParse = debounce(parseMarkdown, 300)
const debounceSave = debounce(saveDoc, 800)


// ==================== 核心逻辑 ====================
// 加载文档：读取后端的标题+内容，赋值给子组件本地存储
const loadDoc = async () => {
    if (!id) return
    const res = await request.get(`/doc/${id}`)
    // ✅ 存储后端返回的标题
    title.value = res.data.title
    editorContent.value = res.data.content
    // 同步给父组件
    emit('update:title', title.value)
    emit('update:editorContent', editorContent.value)
}

// 编辑器内容变化
watch(editorContent, (newVal) => {
    emit('update:editorContent', newVal)
    emit('update:status', '未保存')
    debounceParse(newVal)  // 解析标题
    debounceSave()        // 自动保存
})

// 初始化
onMounted(async () => {
    await nextTick()
    loadDoc()
})
// id变化重新加载
watch(() => id, loadDoc)

</script>

<style scoped>
/* 限制预览模式下的图片大小 */
:deep(.md-preview img) {
    max-width: 200px !important;
    max-height: 200px !important;
    border-radius: 4px;
    /* 可选：加圆角更美观 */
}

/* 限制编辑模式下的图片大小（如果编辑器支持实时预览） */
:deep(.md-editor-content img) {
    max-width: 200px !important;
    max-height: 200px !important;
}

/* 修复自定义图片表情的显示 */
:deep(.emojis li) {
    height: 32px !important;
    line-height: 32px !important;
    width: 32px !important;
}

:deep(.emojis li img) {
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: contain;
}
</style>
