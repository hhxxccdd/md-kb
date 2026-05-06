import prisma from "../../utils/prisma";
import { throwBusinessError } from "../../utils/throwError";

type CreateDocumentParams = {
  userId: number;
  title: string;
  content?: string | null;
};

type UpdateDocumentParams = {
  id: number;
  userId: number;
  title: string;
  content?: string | null;
};

export const createDocument = async ({
  userId,
  title,
  content,
}: CreateDocumentParams) => {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        title,
        content,
        owner_user_id: userId,
        last_edited_by: userId,
        is_shared: false,
        is_deleted: false,
        version: 1,
      },
    });

    await tx.documentCollaborator.create({
      data: {
        document_id: doc.id,
        user_id: userId,
      },
    });

    return doc;
  });
};

export const getPrivateDocumentsByUserId = async (userId: number) => {
  return prisma.document.findMany({
    where: {
      owner_user_id: userId,
      is_shared: false,
      is_deleted: false,
    },
    orderBy: {
      updated_at: "desc",
    },
  });
};

export const getSharedDocumentsByUserId = async (userId: number) => {
  return prisma.document.findMany({
    where: {
      is_shared: true,
      is_deleted: false,
      collaborators: {
        some: {
          user_id: userId,
        },
      },
    },
    orderBy: {
      updated_at: "desc",
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });
};

export const getDocumentById = async (id: number, userId: number) => {
  const doc = await prisma.document.findFirst({
    where: {
      id,
      is_deleted: false,
      collaborators: {
        some: {
          user_id: userId,
        },
      },
    },
  });

  if (!doc) throwBusinessError("文档不存在或无权访问", 404);
  return doc;
};

export const updateDocument = async ({
  id,
  userId,
  title,
  content,
}: UpdateDocumentParams) => {
  const canEdit = await prisma.documentCollaborator.findUnique({
    where: {
      document_id_user_id: {
        document_id: id,
        user_id: userId,
      },
    },
  });

  if (!canEdit) throwBusinessError("无权编辑文档", 403);

  return prisma.document.update({
    where: { id },
    data: {
      title,
      content,
      last_edited_by: userId,
      version: {
        increment: 1,
      },
    },
  });
};

export const deleteDocument = async (id: number, userId: number) => {
  const result = await prisma.document.updateMany({
    where: {
      id,
      owner_user_id: userId,
      is_deleted: false,
    },
    data: {
      is_deleted: true,
    },
  });

  if (result.count === 0) {
    throwBusinessError("文档不存在或无权删除", 404);
  }
};

export const shareDocument = async (id: number, userId: number) => {
  const result = await prisma.document.updateMany({
    where: {
      id,
      owner_user_id: userId,
      is_deleted: false,
    },
    data: {
      is_shared: true,
    },
  });

  if (result.count === 0) {
    throwBusinessError("文档不存在或无权操作", 404);
  }
};

export const searchDocument = async (userId: number, keyWord: string) => {
     return prisma.document.findMany({
      where:{
        is_deleted:false,
        title:{
          contains: keyWord
        },
        OR: [
          {
            owner_user_id:userId,
            is_shared:false
          },
          {
            is_shared:true,
            collaborators: {
              some: {
                user_id:userId
              }
            }
          }
        ]
      },
      orderBy:{
          updated_at:'desc'
      },
      take:5
     })
};
