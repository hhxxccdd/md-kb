import { WebSocket } from "ws";
import type { CollabClient, CollabUser } from "./type";

const rooms = new Map<number, Set<CollabClient>>();

const cleanupRoom = (docId: number) => {
  const room = rooms.get(docId);

  if (!room) return;

  for (const client of room) {
    if (client.ws.readyState !== WebSocket.OPEN) {
      room.delete(client);
    }
  }

  if (room.size === 0) {
    rooms.delete(docId);
  }
};

//加入房间
export const joinRoom = (client: CollabClient) => {
  let room = rooms.get(client.docId);

  if (!room) {
    room = new Set<CollabClient>();
    rooms.set(client.docId, room);
  }

  room.add(client);
};

//离开房间
export const leaveRoom = (client: CollabClient) => {
  const room = rooms.get(client.docId);

  if (!room) return;

  room.delete(client);

  if (room.size === 0) {
    rooms.delete(client.docId);
  }
};

//广播
export const broadcastToRoom = (
  docId: number,
  sender: CollabClient | null,
  data: string,
) => {
  cleanupRoom(docId);

  const room = rooms.get(docId);

  if (!room) return;

  for (const client of room) {
    if (sender && client === sender) continue;

    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
};

//获取单个文档链接的多少
export const getRoomSize = (docId: number) => {
  cleanupRoom(docId);

  return rooms.get(docId)?.size ?? 0;
};

//获取在线用户
export const getRoomUser = (docId: number): CollabUser[] => {
  cleanupRoom(docId);

  const room = rooms.get(docId);
  if (!room) return [];

  const userMap = new Map<number, CollabUser>();

  for (const client of room) {
    userMap.set(client.userId, {
      id: client.userId,
      username: client.username,
      avatar: client.avatar,
    });
  }

  return Array.from(userMap.values());
};

//广播所有用户
export const broadcastPresence = (docId: number) => {
  const users = getRoomUser(docId);

  broadcastToRoom(docId, null, JSON.stringify({ type: "presence", users }));
};
