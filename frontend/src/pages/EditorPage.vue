<template>
  <div class="editor">
    <EditorHeader
      :title="title"
      :status="status"
      :online-users="onlineUsers"
      :can-invite="canInvite"
      :quality-checking="
        qualityStatus === 'checking' || qualityAIStatus === 'checking'
      "
      :can-check-quality="status === '已保存' && Boolean(editorContent.trim())"
      @quality-check="handleQualityCheck"
      @back="router.push('/')"
      @export="exportMarkdown"
      @invite="copyInviteLink"
    ></EditorHeader>
    <div class="editor-container">
      <!-- 在模板中使用组件，用v-model绑定内容 -->
      <AsyncMyEditor
        ref="myMdEditorRef"
        :key="id ?? 'new-document'"
        @update:title="title = $event"
        @editor-ready="handleEditorReady"
        theme="light"
        @update:editor-content="handleEditorContentUpdate"
      >
      </AsyncMyEditor>
    </div>
    <div>
      <AiInlineHint
        :hint="selectionHint"
        @action="handleSelectionAction"
        @dismiss="dismissSelectionHint"
      ></AiInlineHint>
      <!-- AI弹窗 -->
      <AiLanguageMenu
        :visible="languageMenuVisible"
        :position="pendingTranslationSelection?.position"
        @select="handleTranslationLanguageSelect"
        @close="closeLanguageMenu"
      />

      <AiReviewPopover
        :visible="reviewVisible"
        :review="review"
        :status="reviewStatus"
        :error="reviewError"
        @accept="acceptAIReview"
        @retry="retryAIReview"
        @close="closeAIReview"
      />

      <MarkdownQualityDrawer
        :visible="qualityDrawerVisible"
        :status="qualityStatus"
        :ai-status="qualityAIStatus"
        :issues="qualityIssues"
        :error="qualityError"
        :ai-error="qualityAIError"
        :summary="qualitySummary"
        @close="qualityDrawerVisible = false"
        @locate="handleLocateQualityIssue"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  onBeforeUnmount,
  watch,
  defineAsyncComponent,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import EditorHeader from "../features/editor/components/EditorHeader.vue";
//引入Store
import { useAuthStore } from "../features/auth/stores/useAuthStore";
import AiLanguageMenu from "../features/ai/components/AiLanguageMenu.vue";
import AiReviewPopover from "../features/ai/components/AiReviewPopover.vue";
import { useAIReview } from "../features/ai/composables/useAIReview";
import {
  createDocumentInvite,
  getDocumentById,
} from "../features/documents/api/documents";
import type { DocumentItem } from "../features/documents/types/documents";
import { useDocumentCollaboration } from "../features/collaboration/composables/useDocumentCollaboration";
import { useDocumentDraft } from "../features/documents/composables/useDocumentDraft";
import type { DocumentLifecycle } from "../features/documents/types/document";
import type { EditorView } from "@codemirror/view";
import { downloadMarkdown } from "../features/documents/utils/downloadMarkdown.ts";
import EditorLoading from "../features/editor/components/EditorLoading.vue";
import EditorLoadError from "../features/editor/components/EditorLoadError.vue";
import type { MarkdownEditorExpose } from "../features/editor/types/editor.ts";
import AiInlineHint from "../features/ai/components/AiInlineHint.vue";
import { useAISelectionHint } from "../features/ai/composables/useAISelectionHint";
import type { AIActionType, AISelectionHint } from "../features/ai/types/ai.ts";
import { useAIInlineDiff } from "../features/ai/composables/useAIInlineDiff.ts";
import MarkdownQualityDrawer from "../features/quality/components/MarkdownQualityDrawer.vue";
import { useMarkdownQualityCheck } from "../features/quality/composables/useMarkdownQualityCheck";
import type { MarkdownQualityIssue } from "../features/quality/types/markdownQuality";

//定义异步组件
const AsyncMyEditor = defineAsyncComponent({
  loader: () => import("../features/editor/components/MyMdEditor.vue"),
  loadingComponent: EditorLoading,
  errorComponent: EditorLoadError,
  delay: 150,
  suspensible: false,
  onError(_error, retry, fail, attempts) {
    if (attempts <= 1) {
      retry();
      return;
    }

    fail();
  },
});

//1.页面依赖：路由，登录用户
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

//2.当前文档的业务状态
const id = computed(() => route.params.id as string | undefined);
const documentLifecycle = ref<DocumentLifecycle>("draft");
const title = ref<string>("");
const editorContent = ref<string>("");
const doc = ref<DocumentItem>();
const isDocumentLoaded = ref(false);

//3.页面展示状态
const status = ref<string>("");
const canInvite = computed(() => {
  return Boolean(
    doc.value && doc.value.owner_user_id === authStore.userInfo?.id,
  );
});
const qualityDrawerVisible = ref(false);

//4.编辑器与协同资源句柄
//获取封装组件myMdEditor实例
const myMdEditorRef = ref<MarkdownEditorExpose>();
const editorView = ref<EditorView>();

//5.AI功能状态
const pendingTranslationSelection = ref<AISelectionHint>();
const languageMenuVisible = ref(false);

const {
  hint: selectionHint,
  dismiss: dismissSelectionHint,
  hide: hideSelectionHInt,
} = useAISelectionHint(editorView);

const {
  review,
  visible: reviewVisible,
  status: reviewStatus,
  result: reviewResult,
  error: reviewError,
  start: startAIReview,
  retry: retryAIReview,
  close: closeAIReview,
} = useAIReview();

const {
  onlineUsers,
  initialize: initializeDocumentCollaboration,
  dispose: disposeDocumentCollaboration,
} = useDocumentCollaboration({
  onLocalChange: () => {
    status.value = "未保存";
  },
  onSaved: () => {
    status.value = "已保存";
  },
  onConnected: () => {
    documentLifecycle.value = "collaborating";
  },
  onReconnected: () => {
    window.location.reload();
  },
});

const {
  handleContentChange: handleEditorContentChange,
  dispose: disposeDocumentDraft,
} = useDocumentDraft({
  editorContent,
  lifecycle: documentLifecycle,
  onStatusChange: (nextStatus) => {
    status.value = nextStatus;
  },
  onCreated: async (documentId) => {
    await router.replace(`/edit/${documentId}`);
  },
});

const { render: renderAIInlineDiff, clear: clearAIInlineDiff } =
  useAIInlineDiff(editorView, () => {
    closeAIReview();
    ElMessage.info("文档内容已变化，AI 建议已失效");
  });

const {
  status: qualityStatus,
  aiStatus: qualityAIStatus,
  issues: qualityIssues,
  error: qualityError,
  aiError: qualityAIError,
  summary: qualitySummary,
  run: runQualityCheck,
  markStale: markQualityCheckStale,
  reset: resetQualityCheck,
} = useMarkdownQualityCheck();

async function handleQualityCheck() {
  const content = editorContent.value;

  if (!content.trim()) {
    ElMessage.warning("文档内容为空,无法检查");
    return;
  }

  qualityDrawerVisible.value = true;

  await runQualityCheck(content);
}

function handleEditorContentUpdate(content: string) {
  handleEditorContentChange(content);
  markQualityCheckStale(content);
}

function handleLocateQualityIssue(issue: MarkdownQualityIssue) {
  const view = editorView.value;
  const location = issue.location;

  if (!view || !location) {
    return;
  }

  const document = view.state.doc;

  if (location.line < 1 || location.line > document.lines) {
    ElMessage.warning("问题位置已经失效，请重新检查");
    return;
  }

  // 再次校验这一行是否仍然是检查时的内容
  const currentLine = document.line(location.line);

  if (issue.excerpt !== undefined && currentLine.text !== issue.excerpt) {
    ElMessage.warning("问题位置已经失效，请重新检查");
    return;
  }

  const from = Math.max(
    currentLine.from,
    Math.min(location.from, currentLine.to),
  );

  const to = Math.max(from, Math.min(location.to, currentLine.to));

  view.dispatch({
    selection: {
      anchor: from,
      head: to,
    },
    scrollIntoView: true,
  });

  view.focus();
}

function startReview(
  action: AIActionType,
  selection: AISelectionHint,
  targetLanguage?: string,
) {
  hideSelectionHInt();

  void startAIReview({
    action,
    inputText: selection.text,
    expectedText: selection.text,

    from: selection.from,
    to: selection.to,
    position: selection.position,

    targetLanguage,
  });
}

function handleSelectionAction(action: AIActionType) {
  const hint = selectionHint.value;
  if (!hint) return;

  if (action === "translate") {
    pendingTranslationSelection.value = hint;
    languageMenuVisible.value = true;
    hideSelectionHInt();
    return;
  }

  startReview(action, hint);
}

function handleTranslationLanguageSelect(language: string) {
  const selection = pendingTranslationSelection.value;
  closeLanguageMenu();

  if (!selection) return;

  startReview("translate", selection, language);
}

function closeLanguageMenu() {
  languageMenuVisible.value = false;
  pendingTranslationSelection.value = undefined;
}

function acceptAIReview() {
  const editor = myMdEditorRef.value;
  const currentReview = review.value;

  if (!editor || !currentReview || !reviewResult.value) return;

  clearAIInlineDiff();

  const replaced = editor.replaceRange(
    currentReview.from,
    currentReview.to,
    currentReview.expectedText,
    reviewResult.value,
  );

  if (!replaced) {
    ElMessage.warning("原选区内容已经发生变化，请重新生成建议");
    return;
  }

  closeAIReview();
}

const tryInitializeDocumentCollaboration = () => {
  const documentId = id.value;

  if (!documentId || !editorView.value || !isDocumentLoaded.value) return;

  initializeDocumentCollaboration(documentId, editorView.value);
};

const handleEditorReady = (view: EditorView) => {
  editorView.value = view;
  tryInitializeDocumentCollaboration();
};

/**
 * 导出MD文件的核心方法
 */
const exportMarkdown = () => {
  if (!editorContent.value.trim()) {
    ElMessage.warning("请输入内容再导出");
    return;
  }

  downloadMarkdown(editorContent.value, `markdown_${Date.now()}.md`);
};

//获取分享链接
const copyInviteLink = async () => {
  if (!id.value) {
    ElMessage.warning("请先保存文档后再邀请协作");
    return;
  }

  try {
    const res = await createDocumentInvite(Number(id.value));

    const token = res.data.token;

    const inviteUrl = `${window.location.origin}/invite/${token}`;

    await navigator.clipboard.writeText(inviteUrl);

    ElMessage.success("邀请链接已复制");
  } catch {
    // request 拦截器已经统一提示业务错误。
  }
};

const loadDocument = async (docId: string) => {
  try {
    const res = await getDocumentById(Number(docId));

    doc.value = res.data;
    isDocumentLoaded.value = true;
    tryInitializeDocumentCollaboration();
  } catch {}
};

const resetDocumentCollaboration = () => {
  disposeDocumentCollaboration();
  qualityDrawerVisible.value = false;
  resetQualityCheck();
  editorView.value = undefined;
};

watch(
  id,
  (docId, previousDocId) => {
    disposeDocumentDraft();
    if (docId === previousDocId) return;

    resetDocumentCollaboration();

    isDocumentLoaded.value = false;
    doc.value = undefined;

    documentLifecycle.value = docId ? "initializing-collab" : "draft";

    if (!docId) return;

    void loadDocument(docId);
  },
  { immediate: true },
);

watch(
  [review, reviewResult],
  ([currentReview, result]) => {
    if (!currentReview || !result) {
      clearAIInlineDiff();
      return;
    }

    renderAIInlineDiff({
      from: currentReview.from,
      to: currentReview.to,
      replacement: result,
    });
  },
  { flush: "post" },
);

onBeforeUnmount(() => {
  disposeDocumentDraft();
  resetDocumentCollaboration();
});
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
