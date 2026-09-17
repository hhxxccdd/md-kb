export type OnlineUser = {
  id: number;
  username: string;
  avatar: string | null;
};

export type CollabMessage =
  | { type: "connected"; docId: number; userId: number }
  | { type: "pong"; message: string }
  | { type: "presence"; users: OnlineUser[] }
  | { type: "content-change"; content: string; userId: number }
  | { type: "content-save"; content: string }
  | { type: "y-update"; update: number[]; userId: number }
  | { type: "awareness-update"; update: number[]; userId?: number }
  | { type: "error"; message: string }
  | { type: "saved"; docId: number; updatedAt: string }
  | {type:'y-sync',update:number[]}
