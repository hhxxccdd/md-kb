import prisma from "../../utils/prisma";
import type { PendingSave } from "./type";

const pendingSaves = new Map<number, PendingSave>();

const parseTitleFromMarkdown = (content: string) => {
  const firstLine = content.split("\n")[0]?.trim();

  if (!firstLine) return "未命名文档";

  if (firstLine.startsWith("# ")) {
    return firstLine.slice(2).trim() || "未命名文档";
  }

  return firstLine;
};

const saveDocumentNow = async (
  docId: number,
  content: string,
  userId: number,
) => {
  await prisma.document.update({
    where: {
      id: docId,
    },
    data: {
      title: parseTitleFromMarkdown(content),
      content,
      last_edited_by: userId,
      version: {
        increment: 1,
      },
    },
  });
};

export const scheduleSave = (
  docId: number,
  content: string,
  userId: number,
  onSaved?:() => void
) => {
  const oldTask = pendingSaves.get(docId);

  if (oldTask) {
    clearTimeout(oldTask.timer);
  }

  const timer = setTimeout(async () => {
    try {
      await saveDocumentNow(docId,content,userId)

      pendingSaves.delete(docId);

      onSaved?.()
    } catch (error) {
      console.log("保存协同文档失败", error);
    }
  }, 2000);

  pendingSaves.set(docId, {
    content,
    lastEditeBy: userId,
    timer,
  });
};

export const scheduleSaveFromYDoc = async (
    docId:number,
    userId:number,
    getContent:() => Promise<string> | string,
    onSaved?:() => void
) => {
    const content = await getContent()

    scheduleSave(docId,content,userId,onSaved)
}



export const flushSave = async (docId: number) => {
  const task = pendingSaves.get(docId);
  if (!task) return;

  clearTimeout(task.timer);

  try {
    await saveDocumentNow(docId, task.content, task.lastEditeBy);
    pendingSaves.delete(docId);
  } catch (error) {
    console.log("立即保存协同文档失败", error);
  }
};

export const flushAllSaves = async () => {
  const tasks = Array.from(pendingSaves.entries());

  await Promise.all(
    tasks.map(async ([docId, task]) => {
      clearTimeout(task.timer);

      try {
        await saveDocumentNow(docId, task.content, task.lastEditeBy);
        pendingSaves.delete(docId);
      } catch (error) {
        console.log("批量保存协同文档失败",docId,error);
      }
    }),
  );
};
