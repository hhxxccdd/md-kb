<template>
    <div class="editor">
        <div class="editor-head">
            <div class="editor-head-left">
                <div class="back" @click="router.push('/')">
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
                     <el-avatar
                           v-for="user in onlineUsers"
                          :key="user.id"
                          :size="28"
                          :src="user.avatar || undefined"
                          :title="user.username"
                     >
                       {{ user.username.slice(0, 1) }}
                    </el-avatar>
                     <div class="share" v-if="doc?.is_shared">
                        <el-button type="primary" @click="copyInviteLink"  v-show="doc.owner_user_id === userInfo?.id">邀请协作</el-button>
                    </div>
                </div>
            </div>
        </div>
        <div class="editor-container">
            <!-- 在模板中使用组件，用v-model绑定内容 -->
            <MyMdEditor ref="myMdEditorRef" :id="id"  :collab-mode="Boolean(id)" @update:title="title = $event" @update:status="status = $event"
                @editor-ready="handleEditorReady"
                theme="light" @update:editor-content="handleEditorContentChange">
            </MyMdEditor>
        </div>
        <div>
            <!-- AI弹窗 -->
            <AiModel :doc_id="id" v-model:visible="modalVisible" :mode="aiMode" :text="selectedText" @replace="replace"
                :documentContext="editorContent" />
        </div>
    </div>

</template>

<script setup lang="ts">
import { computed, ref,onMounted,onBeforeUnmount,watch } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import MyMdEditor from '../component/editor/MyMdEditor.vue';
//引入Store
import { useAuthStore } from '../stores/user';
//引入elementplus图标样式
import { Back } from '@element-plus/icons-vue'
import AiModel from '../component/ai/AiModel.vue';
import { getDocumentById } from '../api';
import { createDocumentInvite, type DocumentItem } from '../api';
import { ElMessage } from 'element-plus';
import { UseCollabSocket } from '../composables/useCollabSocket';
import { useYjsMarkdown } from '../composables/useYjsMarkdown';
import { StateEffect } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { OnlineUser } from '../type/collab'



const userInfo = useAuthStore().userInfo
const route = useRoute()
const router = useRouter()

const id = computed(() => route.params.id as string | undefined)
const title = ref<string>('')
const status = ref<string>('')
const editorContent = ref<string>('')
const doc = ref<DocumentItem>()
const onlineUsers = ref<OnlineUser[]>([])
let collab: ReturnType<typeof UseCollabSocket> | null = null
let yjsMarkdown: ReturnType<typeof useYjsMarkdown> | null = null
const editorView = ref<EditorView>()
const initialDocumentContent = ref<string>()
//获取封装组件myMdEditor实例
const myMdEditorRef = ref<typeof MyMdEditor>()

const initDocumentCollab = (_initialContent:string, view: EditorView) => {
     if(!id.value || collab) return


     //创建Yjs层
     yjsMarkdown = useYjsMarkdown({
        initialContent: '',
        onLocalUpdate:(update) => {
            collab?.sendYUpdate(update)
        }
     })

     //把yjs协同扩展挂到CodeMirror上
     view.dispatch({
        effects:StateEffect.appendConfig.of(
             yjsMarkdown.collabExtension
        )
     })


     //创建WebSocket层
     collab = UseCollabSocket({
        docId: id.value,

        onYUpdate:(update) => {
             yjsMarkdown?.applyRemoteUpdate(update)
        },

        onSaved:() => {
             status.value = '已保存'
        },

        onRecoonect:() => {
            window.location.reload()
        }
     })

      // 2. 在线用户逻辑继续保留
     watch(
         collab.onlineUsers,
         (users) => {
                onlineUsers.value = users
                    },
         { immediate: true },
     )

    
     collab.connect()
}

const tryInitDocumentCollab = () => {
    if (!editorView.value || initialDocumentContent.value === undefined) return
    initDocumentCollab(initialDocumentContent.value, editorView.value)
}

const handleEditorReady = (view: EditorView) => {
    editorView.value = view
    tryInitDocumentCollab()
}


const handleEditorContentChange = (content: string) => {
  editorContent.value = content

  // 保存仍然发完整内容，但不再拿它做实时广播
}



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


//获取分享链接
const copyInviteLink = async () => {
   if (!id.value) {
      ElMessage.warning('请先保存文档后再邀请协作')
      return
   }

   try {
      const res = await createDocumentInvite(Number(id.value))

      const token = res.data.token
  
      const inviteUrl = `${window.location.origin}/invite/${token}`

      await navigator.clipboard.writeText(inviteUrl)

      ElMessage.success('邀请链接已复制')
   } catch {
      // request 拦截器已经统一提示业务错误。
   }
}


onMounted(async () => {
   if (!id.value) return
   try {
      const res = await getDocumentById(Number(id.value))
      doc.value = res.data

      initialDocumentContent.value = res.data.content ?? ""
      tryInitDocumentCollab()
   } catch {
      // request 拦截器已经统一提示错误。
   }
})


onBeforeUnmount(() => {
    collab?.close()
    yjsMarkdown?.destroy()
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
    box-sizing: border-box;
}

.editor-head-left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
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
}

.share {
    display: flex;
}

.editor-head-right-func {
    display: flex;
    align-items: center;
    margin-left: auto;
    padding-right: 24px;
    gap: 12px;
}

.editor-head-right-func-name{
     font-size: medium;
     font-weight: 400;
}



.editor-head-right {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: flex-end;
    min-width: 0;
}

.editor-head-right-ai {
    display: flex;
    align-items: center;
    gap: 12px;
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
