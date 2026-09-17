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

export interface CreateInviteResult {
  token: string;
}

export interface DocumentInviteDetail {
  document_id: number;
  title: string;
  inviter: DocumentOwner;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELED";
  expires_at: string | null;
}

export interface AcceptInviteResult {
  document_id: number;
}
