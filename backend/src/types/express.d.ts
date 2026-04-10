// src/types/express.d.ts
declare namespace Express {
  export interface Request {
    user?: {
      id: number;        // 根据你的用户 ID 类型调整
      username?: string;
      roles?: string[];
    };
  }
}