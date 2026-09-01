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
            <MyMdEditor ref="myMdEditorRef"  :key="id ?? 'new-document'"  @update:title="title = $event"
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
import { computed, ref,onBeforeUnmount,watch } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import MyMdEditor from '../component/editor/MyMdEditor.vue';
//引入Store
import { useAuthStore } from '../stores/user';
//引入elementplus图标样式
import { Back } from '@element-plus/icons-vue'
import AiModel from '../component/ai/AiModel.vue';
import { createDocument,createDocumentInvite,getDocumentById,updateDocument,type DocumentItem } from '../api';
import { ElMessage } from 'element-plus';
import { useDocumentCollaboration } from '../composables/useDocumentCollaboration';
import type { EditorView } from '@codemirror/view';



type DocumentLifecycle =
     | 'draft'                    //未创建，本地草稿
     | 'creating'                 //创建请求进行中
     | 'initializing-collab'      //已有id，协同资源准备中
     | 'collaborating'            // WebSocket/Yjs已可用
     | 'create-failed'            //创建失败，草稿保留并允许重试

//1.页面依赖：路由，登录用户
const userInfo = useAuthStore().userInfo
const route = useRoute()
const router = useRouter()

//2.当前文档的业务状态
const id = computed(() => route.params.id as string | undefined)
const documentLifecycle = ref<DocumentLifecycle>('draft')
const title = ref<string>('')
const editorContent = ref<string>('')
let   draftRevision = 0
let   createTimer:ReturnType<typeof setTimeout> | undefined
const doc = ref<DocumentItem>()
const initialDocumentContent = ref<string>()

//3.页面展示状态
const status = ref<string>('')

//4.编辑器与协同资源句柄
//获取封装组件myMdEditor实例
const myMdEditorRef = ref<typeof MyMdEditor>()
const editorView = ref<EditorView>()


const {onlineUsers,initialize: initializeDocumentCollaboration,dispose: disposeDocumentCollaboration} = useDocumentCollaboration({
     onLocalChange: () => {
        status.value = '未保存'
     },
     onSaved: () => {
        status.value = '已保存'
     },
     onConnected: () => {
        documentLifecycle.value = 'collaborating'
     },
     onReconnected: () => {
        window.location.reload()
     }
})




const tryInitializeDocumentCollaboration = () => {
     const documentId = id.value

     if(!documentId || !editorView.value || initialDocumentContent.value === undefined) return

     initializeDocumentCollaboration(documentId,editorView.value)


}

const handleEditorReady = (view: EditorView) => {
    editorView.value = view
    tryInitializeDocumentCollaboration()
}


const handleEditorContentChange = (content: string) => {
  editorContent.value = content

  if(documentLifecycle.value === 'draft' || documentLifecycle.value === 'creating'){
             draftRevision +=1
  }

  if(documentLifecycle.value === 'draft'){
    status.value = '未保存'
    scheduleDraftCreation()
  }


}

const extractDocumentTitle = (content:string) => {
     const firstline = content.split('\n')[0]?.trim() ?? ''

     if(!firstline)  return '未命名文档'

     return firstline.startsWith('# ') ? firstline.slice(2).trim() || '未命名文档' : firstline
}

//防抖
const cancelScheduleCreation = () => {
    if(!createTimer)  return
    clearTimeout(createTimer)
    createTimer = undefined
}


const createDraftDocument = async() => {

    if(documentLifecycle.value !== 'draft') return

    const contentAtCreation = editorContent.value
    const revisionAtCreation = draftRevision

    if(!contentAtCreation.trim()) return

    documentLifecycle.value = 'creating'
    status.value = '保存中'

    try {
        const result = await createDocument({
            title: extractDocumentTitle(contentAtCreation),
            content: contentAtCreation
        })

        //创建请求期间用户继续输入时，补写最新内容
        if(draftRevision !== revisionAtCreation){
            await updateDocument(result.data.id, {
                 title:extractDocumentTitle(editorContent.value),
                 content:editorContent.value
            })
        }
        status.value = '已保存'
        documentLifecycle.value = 'initializing-collab'
        await router.replace(`/edit/${result.data.id}`)
    }catch {
         documentLifecycle.value = 'create-failed'
         status.value = '保存失败'
    }

}

const scheduleDraftCreation = () => {
    if(documentLifecycle.value !== 'draft') return

    cancelScheduleCreation()

    createTimer = setTimeout(() => {
        createTimer = undefined
        void createDraftDocument()
    },800)

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

const loadDocument = async (docId: string) => {
    try {
        const res = await getDocumentById(Number(docId))

        doc.value = res.data
        initialDocumentContent.value = res.data.content ?? ''
        tryInitializeDocumentCollaboration()
    }catch{

    }
}

const resetDocumentCollaboration = () => {
    disposeDocumentCollaboration()
    editorView.value = undefined
}


 watch(id,(docId,previousDocId) => {
    cancelScheduleCreation()
    if(docId === previousDocId) return

    resetDocumentCollaboration()

    initialDocumentContent.value = undefined
    doc.value = undefined

    documentLifecycle.value = docId ? 'initializing-collab' :'draft'

    if(!docId) return

    void loadDocument(docId)
},{immediate:true})




onBeforeUnmount(() => {
    cancelScheduleCreation()
    resetDocumentCollaboration()
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
