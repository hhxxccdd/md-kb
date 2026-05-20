import express from "express";
import { success } from "../../utils/response";
import { asyncHandler } from "../../utils/asyncHandler";
import { throwBusinessError } from "../../utils/throwError";
import { authMiddleware } from "../user/middleware";
import {
  createDocument,
  deleteDocument,
  getDocumentById,
  getPrivateDocumentsByUserId,
  getSharedDocumentsByUserId,
  shareDocument,
  updateDocument,
  searchDocument,
  createDocumentInvite,
  getDocumentInviteByToken,
  acceptDocumentInvite
} from "./service";

const router = express.Router();

router.use(authMiddleware);

const validateId = (id: string): number => {
  const num = Number(id);
  if (!Number.isInteger(num) || num <= 0) {
    throwBusinessError("无效的文档 id");
  }
  return num;
};

const getParamId = (id: string | string[] | undefined): number => {
  if (typeof id === "string") {
    return validateId(id);
  }
  return throwBusinessError("无效的文档 id");
};

const getCurrentUserId = (userId?: number): number => {
  if (typeof userId === "number") {
    return userId;
  }
  return throwBusinessError("请先登录", 401);
};

// 创建文档，并把创建者加入协作者表。
router.post(
  "/createByUserId",
  asyncHandler(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const { title, content } = req.body;

    if (!title) throwBusinessError("文档标题不能为空");

    const doc = await createDocument({ userId, title, content });
    success(res, doc, "创建成功", 201);
  }),
);

// 查询当前用户创建且未共享的文档。
router.get(
  "/getPCByUserId",
  asyncHandler(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const docList = await getPrivateDocumentsByUserId(userId);
    success(res, docList, "查询成功");
  }),
);

// 查询当前用户参与协作的共享文档。
router.get(
  "/getOPByUserId",
  asyncHandler(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const docList = await getSharedDocumentsByUserId(userId);
    success(res, docList, "查询成功");
  }),
);

//搜索文档
router.post(
  "/search",
  asyncHandler(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const keyWord = String(req.query.keyWord || "").trim();

    if (!keyWord) {
      success(res, [], "搜索成功");
    }

    const docs = await searchDocument(userId, keyWord);

    success(res, docs, "搜索成功");
  }),
);

// 获取单个文档详情，只有协作者可以访问。
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getParamId(req.params.id);
    const userId = getCurrentUserId(req.user?.id);
    const doc = await getDocumentById(id, userId);
    success(res, doc, "获取成功");
  }),
);

// 更新文档，只有协作者可以编辑。
router.post(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getParamId(req.params.id);
    const userId = getCurrentUserId(req.user?.id);
    const { title, content } = req.body;

    if (!title) throwBusinessError("文档标题不能为空");

    const doc = await updateDocument({ id, userId, title, content });
    success(res, doc, "更新成功");
  }),
);

// 删除文档，只有创建者可以软删除。
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getParamId(req.params.id);
    const userId = getCurrentUserId(req.user?.id);

    await deleteDocument(id, userId);
    success(res, null, "删除成功");
  }),
);

// 私有文档转为共享文档，只有创建者可以操作。
router.post(
  "/share/:id",
  asyncHandler(async (req, res) => {
    const id = getParamId(req.params.id);
    const userId = getCurrentUserId(req.user?.id);

    await shareDocument(id, userId);
    success(res, { is_shared: true }, "已设为共享文档");
  }),
);

router.post("/invite/:id",asyncHandler(async (req , res) => {

      const docId = getParamId(req.params.id)
      const userId = getCurrentUserId(req.user?.id)
   
      const result = await createDocumentInvite(docId,userId)
      
      success(res,result,"成功生成链接")
}))

router.get("/invite/:token",asyncHandler(async (req,res) => {
    const token = String(req.params.token || "").trim();

    const invite = await getDocumentInviteByToken(token);

    success(res, invite, "获取邀请信息成功");
}))

router.post("/invite/:token/accept",asyncHandler(async (req,res) => {
    const token = String(req.params.token || "").trim();
    const userId = getCurrentUserId(req.user?.id);

    const result = await acceptDocumentInvite(token,userId);

    success(res, result, "接受邀请成功");
}))

export default router;
