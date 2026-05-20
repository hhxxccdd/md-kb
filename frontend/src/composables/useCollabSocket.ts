import { ref } from "vue";
import type { CollabMessage, OnlineUser } from "../type/collab";

type UseCollabSocketOptions = {
  docId: string | number;
  onYUpdate?: (update: number[], userId?: number) => void;
  onSaved?: (message: {type:'saved',docId:number,updatedAt:string}) => void;
  onRecoonect?:() => void
};

export const UseCollabSocket = (options: UseCollabSocketOptions) => {
  const connected = ref(false);
  const connecting = ref(false);
  const error = ref("");
  const onlineUsers = ref<OnlineUser[]>([]);
  const ws = ref<WebSocket | null>(null);
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectCount = 0
  let manuallyClosed = false
  //以前成功的连接过
  let hasConnectedBefore = false
  //不是断线连接的重连
  let reconnecting = false

  const connect = () => {
    const token = localStorage.getItem("accessToken");

    manuallyClosed = false

    if (!token) {
      error.value = "请先登录";
      return;
    }

    connecting.value = true;

    const wsUrl = `ws://localhost:3000/ws/collab?docId=${options.docId}&token=${encodeURIComponent(token)}`;

    ws.value = new WebSocket(wsUrl);

    ws.value.onopen = () => {
      ws.value?.send(
        JSON.stringify({
          type: "ping",
        }),
      );
    };

    ws.value.onmessage = (event) => {
      let message: CollabMessage;

      try {
        message = JSON.parse(event.data);
      } catch {
        console.error("协同信息格式错误", event.data);
        return;
      }

      if (message.type === "connected") {
        connected.value = true;
        connecting.value = false;
        reconnectCount = 0
        
        if(reconnecting){
           reconnecting = false
           options.onRecoonect?.()
           return
        }

        hasConnectedBefore = true

        console.log("协同连接成功", message);
      }

      if (message.type === "pong") {
        console.log("协同服务响应", message.message);
      }

      if (message.type === "presence") {
        onlineUsers.value = message.users;
      }

      if (message.type === "y-update" ) {
        options.onYUpdate?.(message.update, message.userId);
        return;
      }

      if(message.type === "y-sync"){
         options.onYUpdate?.(message.update)
         return
      }


      if(message.type  === "saved"){
         options.onSaved?.(message)
         return
      }

      if (message.type === "error") {
        error.value = message.message;
        return;
      }
    };

    ws.value.onerror = () => {
      error.value = "协同连接异常";
    };

    ws.value.onclose = (event) => {
      connected.value = false;
      connecting.value = false;

      if (event.reason) {
        error.value = event.reason;
      }

      if(!manuallyClosed){
         reconnecting = hasConnectedBefore
         scheduleReconnect()
      }
    };
  };



  const sendYUpdate = (update: number[]) => {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN || !connected.value) return;

    ws.value.send(
      JSON.stringify({
        type: "y-update",
        update,
      }),
    );
  };

  const close = () => {
    manuallyClosed = true
    if(reconnectTimer){
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    ws.value?.close();
    ws.value = null;
    connected.value = false;
  };

  const scheduleReconnect = () => {
     if(reconnectTimer) return

     reconnectCount += 1

     const delay = Math.min(1000 * reconnectCount,5000)

     reconnectTimer = setTimeout(() => {
       reconnectTimer = null
       connect()
     },delay)
  }

  return {
    connected,
    connecting,
    error,
    onlineUsers,
    connect,
    close,
    sendYUpdate,
  };
};
