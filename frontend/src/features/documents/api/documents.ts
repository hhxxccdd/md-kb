import request from "../../../shared/api/request";
import type { ApiResponse } from "../../../shared/types/api";
import type {
  AcceptInviteResult,
  CreateDocumentDto,
  CreateInviteResult,
  DocumentInviteDetail,
  DocumentItem,
  SharedDocumentItem,
  ShareDocumentResult,
  UpdateDocumentDto,
  UploadImageResult,
} from "../types/documents";


export const createDocument = (
  data: CreateDocumentDto,
): Promise<ApiResponse<DocumentItem>> => {
  return request.post("/doc/createByUserId", data);
};

// 获取私有文档
export const getPrivateDocuments = (): Promise<ApiResponse<DocumentItem[]>> => {
  return request.get("/doc/getPCByUserId");
};

// 获取协作文档
export const getSharedDocuments = (): Promise<ApiResponse<SharedDocumentItem[]>> => {
  return request.get("/doc/getOPByUserId");
};

//搜索文档
export const searchDocuments = (
  keyWord: string,
): Promise<ApiResponse<DocumentItem[]>> => {
  return request.post("/doc/search", null, { params: { keyWord } });
};

//根据文档id获取文档详细内容
export const getDocumentById = (
  id: string | number,
): Promise<ApiResponse<DocumentItem>> => {
  return request.get(`/doc/${id}`);
};

//修改文档
export const updateDocument = (
  id: string | number,
  data: UpdateDocumentDto,
): Promise<ApiResponse<DocumentItem>> => {
  return request.post(`/doc/${id}`, data);
};

//删除文档
export const deleteDocument = (
  id: string | number,
): Promise<ApiResponse<null>> => {
  return request.delete(`/doc/${id}`);
};

// 将私有文档标记为协作文档
export const shareDocument = (
  id: string | number,
): Promise<ApiResponse<ShareDocumentResult>> => {
  return request.post(`/doc/share/${id}`);
};

//上传图片
export const uploadImage = (
  data: FormData,
): Promise<ApiResponse<UploadImageResult>> => {
  return request.post("/upload/image", data);
};

//获取邀请链接
export const createDocumentInvite = (id:string|number): Promise<ApiResponse<CreateInviteResult>> => {
      return request.post(`/doc/invite/${id}`)
   
}

export const getDocumentInvite = (
  token: string,
): Promise<ApiResponse<DocumentInviteDetail>> => {
  return request.get(`/doc/invite/${token}`);
};

export const acceptDocumentInvite = (
  token: string,
): Promise<ApiResponse<AcceptInviteResult>> => {
  return request.post(`/doc/invite/${token}/accept`);
};
