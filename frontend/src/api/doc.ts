import request from "../utils/request";
import type { ApiResponse } from "../type/api";

export interface DocumentOwner {
  id: number;
  username: string;
  avatar: string | null;
}

export interface DocumentItem {
  id: number;
  title: string;
  content: string | null;
  owner_user_id: number;
  version: number;
  last_edited_by: number | null;
  is_deleted: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface SharedDocumentItem extends DocumentItem {
  owner: DocumentOwner;
}

export interface CreateDocumentDto {
  title: string;
  content?: string | null;
}

export interface UpdateDocumentDto {
  title: string;
  content?: string | null;
}

export interface ShareDocumentResult {
  is_shared: boolean;
}

export interface UploadImageResult {
  url: string;
}


export const createDocument = (
  data: CreateDocumentDto,
): Promise<ApiResponse<DocumentItem>> => {
  return request.post("/doc/createByUserId", data);
};

//获取私人文档
export const getPrivateDocuments = (): Promise<ApiResponse<DocumentItem[]>> => {
  return request.get("/doc/getPCByUserId");
};

//获取公开文档
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

//将私有文档分享文公开文档
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
