import prisma from "../../utils/prisma";
import { throwBusinessError } from "../../utils/throwError";
import crypto from "crypto";

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
    where: {
      is_deleted: false,
      title: {
        contains: keyWord,
      },
      OR: [
        {
          owner_user_id: userId,
          is_shared: false,
        },
        {
          is_shared: true,
          collaborators: {
            some: {
              user_id: userId,
            },
          },
        },
      ],
    },
    orderBy: {
      updated_at: "desc",
    },
    take: 5,
  });
};

export const createDocumentInvite = async (
  docId: number,
  inviterUserId: number,
) => {
  const doc = await prisma.document.findFirst({
    where: {
      id: docId,
      owner_user_id: inviterUserId,
      is_deleted: false,
    },
  });

  if (!doc) {
    throwBusinessError("文档不存在或无权邀请", 403);
  }

  const token = crypto.randomUUID();

  const invite = await prisma.documentInvite.create({
    data: {
      document_id: docId,
      inviter_user_id: inviterUserId,
      token,
      status: "PENDING",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    token: invite.token,
  };
};

export const getDocumentInviteByToken = async (token: string) => {
  if (!token) {
    throwBusinessError("邀请token不能为空", 400);
  }

  const invite = await prisma.documentInvite.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          is_deleted: true,
        },
      },
      inviter: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  if (!invite) {
    throwBusinessError("邀请不存在", 404);
    return;
  }

  if (invite.document.is_deleted) {
    throwBusinessError("文档已被删除", 404);
  }

  if (invite.expires_at && invite.expires_at < new Date()) {
    return {
      document_id: invite.document_id,
      title: invite.document.title,
      inviter: invite.inviter,
      status: "EXPIRED",
      expires_at: invite.expires_at,
    };
  }

  return {
    document_id: invite.document_id,
    title: invite.document.title,
    inviter: invite.inviter,
    status: invite.status,
    expires_at: invite.expires_at,
  };
};

export const acceptDocumentInvite = async (token: string, userId: number) => {
  if (!token) {
    throwBusinessError("邀请 token 不能为空", 400);
  }

  const invite = await prisma.documentInvite.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          is_deleted: true,
        },
      },
    },
  });

  if (!invite) {
    return throwBusinessError("邀请不存在", 404);
  }

  if (invite.document.is_deleted) {
    throwBusinessError("文档已被删除", 404);
  }

  if (invite.status !== "PENDING") {
    throwBusinessError("邀请已失效", 400);
  }

  if (invite.expires_at && invite.expires_at < new Date()) {
    await prisma.documentInvite.update({
      where: { id: invite.id },
      data: {
        status: "EXPIRED",
      },
    });
    throwBusinessError("邀请已过期", 400);
  }

  if (invite.invitee_user_id && invite.invitee_user_id !== userId) {
    throwBusinessError("该邀请不属于当前用户", 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentCollaborator.upsert({
      where: {
        document_id_user_id: {
          document_id: invite.document_id,
          user_id: userId,
        },
      },
      update: {},
      create: {
        document_id: invite.document_id,
        user_id: userId,
      },
    });

    await tx.documentInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        invitee_user_id: invite.invitee_user_id ?? userId,
        accepted_at: new Date(),
      },
    });
  });

  return {
    document_id: invite.document_id,
  };
};
