import type { WebSocket } from "ws";

export type CollabUser = {
    id:number;
    username:string;
    avatar:string|null
}

export type CollabClient = {
    ws:WebSocket;
    userId:number;
    docId:number;
    username:string;
    avatar:string|null
}

export type PendingSave = {
     content:string;
     lastEditeBy:number;
     timer: NodeJS.Timeout
}