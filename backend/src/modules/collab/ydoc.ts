import * as Y from "yjs";
import prisma from "../../utils/prisma";

const docs = new Map<number, Y.Doc>();

export const getServerYDoc = async (docId: number) => {
  const existing = docs.get(docId);

  if (existing) {
    return existing;
  }

  const ydoc = new Y.Doc();
  const ytext = ydoc.getText("markdown");

  const document = await prisma.document.findUnique({
    where: {
      id: docId,
    },
    select: {
      content: true,
    },
  });

  ydoc.transact(() => {
    ytext.insert(0, document?.content || "");
  });

  docs.set(docId, ydoc);

  return ydoc;
};

export const applyUpdateToServerDoc = async (
  docId: number,
  update: number[],
) => {
    const ydoc = await getServerYDoc(docId)
    Y.applyUpdate(ydoc,new Uint8Array(update))
    return ydoc
};


export const encodeServerDocState = async (docId:number) => {
    const ydoc = await getServerYDoc(docId)

    return Array.from(Y.encodeStateAsUpdate(ydoc))
}

export const getServerDocContent = async (docId:number) => {
    const ydoc = await getServerYDoc(docId)
    const ytext = ydoc.getText("markdown")

    return ytext.toString()
}
