import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyAccessToken } from "../user/auth";
import { checkDocumentCollaborator } from "./permission";
import { CollabClient } from "./type";
import { scheduleSaveFromYDoc, flushSave } from "./persistence";
import {
  broadcastPresence,
  broadcastToRoom,
  getRoomSize,
  joinRoom,
  leaveRoom,
} from "./room";
import prisma from "../../utils/prisma";
import { applyUpdateToServerDoc,encodeServerDocState, getServerDocContent } from "./ydoc";

export const setupCollabServer = (server: Server) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws/collab",
  });

  wss.on("connection", async (ws, req) => {
    try {
      const url = new URL(req.url || "", "http://localhost");

      const docId = Number(url.searchParams.get("docId"));
      const token = url.searchParams.get("token");

      if (!Number.isInteger(docId) || docId <= 0 || !token) {
        ws.close(1008, "参数错误");
        return;
      }

      const userId = await verifyAccessToken(token);

      const canAccess = await checkDocumentCollaborator(docId, userId);

      if (!canAccess) {
        ws.close(1008, "无权访问该文档");
        return;
      }

      //连接成功
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      });

      if (!user) {
        ws.close(1008, "用户不存在");
        return;
      }

      const client: CollabClient = {
        ws,
        userId,
        docId,
        username: user.username,
        avatar: user.avatar,
      };

      joinRoom(client);

      broadcastPresence(docId);

      ws.send(
        JSON.stringify({
          type: "connected",
          docId,
          userId,
        }),
      );

      const stateUpdate = await encodeServerDocState(docId)

      ws.send(JSON.stringify({
         type:'y-sync',
         update:stateUpdate,
      }))

      ws.on("message", async (raw) => {
        let message: any;

        try {
          message = JSON.parse(raw.toString());
        } catch {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "消息格式错误",
            }),
          );
          return;
        }

        //1.测试链接
        if (message.type === "ping") {
          ws.send(
            JSON.stringify({
              type: "pong",
              message: "协同服务已连接",
            }),
          );
          return;
        }

        //3.Yjs增量同步
        if (message.type === "y-update") {
          if (!Array.isArray(message.update)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Yjs update 格式错误",
              }),
            );
            return;
          }

          await applyUpdateToServerDoc(docId,message.update).catch(error => {
               console.error("服务端应用 Yjs Update 失败",error)

               ws.send(JSON.stringify({
                  type:'error',
                  message:'服务端同步失败'
               }))
          })

          scheduleSaveFromYDoc(docId, userId, () => getServerDocContent(docId), () => {
            broadcastToRoom(
              client.docId,
              null,
              JSON.stringify({
                type: "saved",
                docId: client.docId,
                updatedAt: new Date().toISOString(),
              }),
            );
          });

          broadcastToRoom(
            docId,
            client,
            JSON.stringify({
              type: "y-update",
              update: message.update,
              userId,
            }),
          );
          return;
        }


        //只负责保存，不广播
        if(message.type === "content-save"){
            scheduleSaveFromYDoc(docId,userId,() => getServerDocContent(docId),() => {
                   broadcastToRoom(
                    client.docId,
                    null,
                    JSON.stringify({
                      type:"saved",
                      docId:client.docId,
                      updatedAt:new Date().toISOString()
                    })
                   )
            })

            return
        }

        ws.send(
          JSON.stringify({
            type: "error",
            message: "未知消息类型",
          }),
        );
      });

      ws.on("close", async () => {
        if (!client) return;

        leaveRoom(client);
        broadcastPresence(client.docId);

        if (getRoomSize(client.docId) === 0) {
          await flushSave(client.docId);
        }
      });

      ws.on("error", async () => {
        if (!client) return;
        leaveRoom(client);
        broadcastPresence(client.docId);

        if (getRoomSize(client.docId) === 0) {
          await flushSave(client.docId);
        }
      });
    } catch (error) {
      console.error("协同连接失败", error);
      ws.close(1011, "协同服务错误");
    }
  });
};
