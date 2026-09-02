import type { Ref } from "vue";
import { createDocument, updateDocument } from "../api";
import type { DocumentLifecycle } from "../type/document";

type DocumentSaveStatus = "未保存" | "保存中" | "已保存" | "保存失败";

type UseDocumentDraftOptions = {
  editorContent: Ref<string>;
  lifecycle: Ref<DocumentLifecycle>;
  onStatusChange: (status: DocumentSaveStatus) => void;
  onCreated: (documentId: number) => Promise<void> | void;
  createDelay?: number;
};

export const useDocumentDraft = (options: UseDocumentDraftOptions) => {
  let draftRevision = 0;
  let createTimer: ReturnType<typeof setTimeout> | undefined;

  const extractDocumentTitle = (content: string) => {
    const firstLine = content.split("\n")[0]?.trim() ?? "";

    if (!firstLine) return "未命名文档";

    return firstLine.startsWith("# ")
      ? firstLine.slice(2).trim() || "未命名文档"
      : firstLine;
  };

  const cancelScheduledCreation = () => {
    if (!createTimer) return;

    clearTimeout(createTimer);
    createTimer = undefined;
  };

  const createDraftDocument = async () => {
    if (options.lifecycle.value !== "draft") return;

    const contentAtCreation = options.editorContent.value;
    const revisionAtCreation = draftRevision;

    if (!contentAtCreation.trim()) return;

    options.lifecycle.value = "creating";
    options.onStatusChange("保存中");

    try {
      const result = await createDocument({
        title: extractDocumentTitle(contentAtCreation),
        content: contentAtCreation,
      });

      //创建期间再输入，补写最新内容一轮
      if (draftRevision !== revisionAtCreation) {
        const latestContent = options.editorContent.value;

        await updateDocument(result.data.id, {
          title: extractDocumentTitle(latestContent),
          content: latestContent,
        });
      }

      options.onStatusChange("已保存");
      options.lifecycle.value = "initializing-collab";

      await options.onCreated(result.data.id);
    } catch {
      options.lifecycle.value = "create-failed";
      options.onStatusChange("保存失败");
    }
  };

  const scheduleDraftCreation = () => {
    if (options.lifecycle.value !== "draft") return;

    cancelScheduledCreation();

    createTimer = setTimeout(() => {
      createTimer = undefined;
      void createDraftDocument();
    }, options.createDelay ?? 800);
  };

  const handleContentChange = (content:string) => {
     options.editorContent.value = content

     if(options.lifecycle.value === 'draft' || options.lifecycle.value === 'creating'){
           draftRevision +=1
     }

     if(options.lifecycle.value === 'draft'){
        options.onStatusChange('未保存')
        scheduleDraftCreation()
     }
  }

  const dispose = () => {
    cancelScheduledCreation()
  }

  return {
    handleContentChange,
    dispose
  }
};
