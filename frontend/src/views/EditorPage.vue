<template>
    <div class="editor">
        <EditorHeader :title="title" :status="status" :online-users="onlineUsers" :can-invite="canInvite" @back="router.push('/')" @ai-action="openAiModal"
        @export="exportMarkdown" @invite="copyInviteLink"></EditorHeader>
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
import EditorHeader from '../component/editor/EditorHeader.vue';
import MyMdEditor from '../component/editor/MyMdEditor.vue';
//引入Store
import { useAuthStore } from '../stores/user';
import AiModel from '../component/ai/AiModel.vue';
import { createDocumentInvite,getDocumentById,type DocumentItem} from '../api';
import { ElMessage } from 'element-plus';
import { useDocumentCollaboration } from '../composables/useDocumentCollaboration';
import { useDocumentDraft } from '../composables/useDocumentDraft';
import type { DocumentLifecycle } from '../type/document';
import type { EditorView } from '@codemirror/view';
import { downloadMarkdown } from '../utils/downloadMarkdown.ts';




//1.页面依赖：路由，登录用户
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

//2.当前文档的业务状态
const id = computed(() => route.params.id as string | undefined)
const documentLifecycle = ref<DocumentLifecycle>('draft')
const title = ref<string>('')
const editorContent = ref<string>('')
const doc = ref<DocumentItem>()
const isDocumentLoaded = ref(false)
//3.页面展示状态
const status = ref<string>('')
const canInvite = computed(() => {
    return Boolean(
        doc.value &&
        doc.value.owner_user_id === authStore.userInfo?.id
    )
})

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

const {
    handleContentChange:handleEditorContentChange,
    dispose: disposeDocumentDraft
} = useDocumentDraft({
    editorContent,
    lifecycle:documentLifecycle,
    onStatusChange:(nextStatus) => {status.value = nextStatus},
    onCreated: async (documentId) =>  {await router.replace(`/edit/${documentId}`)}
})




const tryInitializeDocumentCollaboration = () => {
     const documentId = id.value

     if(!documentId || !editorView.value || !isDocumentLoaded.value) return

     initializeDocumentCollaboration(documentId,editorView.value)


}

const handleEditorReady = (view: EditorView) => {
    editorView.value = view
    tryInitializeDocumentCollaboration()
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

    if(!editorContent.value.trim()){
        ElMessage.warning('请输入内容再导出')
        return
    }

    downloadMarkdown(
        editorContent.value,
        `markdown_${Date.now()}.md`
    )
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
        isDocumentLoaded.value = true
        tryInitializeDocumentCollaboration()
    }catch{

    }
}

const resetDocumentCollaboration = () => {
    disposeDocumentCollaboration()
    editorView.value = undefined
}


 watch(id,(docId,previousDocId) => {
    
    disposeDocumentDraft()
    if(docId === previousDocId) return

    resetDocumentCollaboration()

    isDocumentLoaded.value = false
    doc.value = undefined

    documentLifecycle.value = docId ? 'initializing-collab' :'draft'

    if(!docId) return

    void loadDocument(docId)
},{immediate:true})




onBeforeUnmount(() => {
    disposeDocumentDraft()
    resetDocumentCollaboration()
})

</script>

<style scoped>
.editor {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

.editor-container {
    height: calc(100% - 50px);
    width: 100%;
}
</style>
