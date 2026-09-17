import type { AIRequestOptions, AIStreamChunk } from "../types/ai";

interface LegacySSEData {
  status: "loading" | "done" | "error";
  content?: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (refreshToken) {
    headers["x-refresh-token"] = refreshToken;
  }

  return headers;
}

function parseChunk(data: LegacySSEData): AIStreamChunk {
  if (data.status === "loading") {
    return {
      type: "token",
      text: data.content ?? "",
    };
  }

  if (data.status === "done") {
    return { type: "done" };
  }

  return {
    type: "error",
    error: {
      kind: "server",
      message: data.content ?? "AI服务异常",
      retryable: true,
    },
  };
}

export async function streamAIRequest(
  options: AIRequestOptions,
): Promise<void> {
  const { url, payload, signal, onChunk } = options;

  const response = await fetch(url, {
     method:'POST',
     headers:getAuthHeaders(),
     body:JSON.stringify({params:payload}),
     signal
  })

  if(!response.ok){
    throw new Error(`AI request failed: ${response.status}`)
  }

  const reader = response.body?.getReader()

  if(!reader){
    throw new Error('当前浏览器不支持流式读取')
  }

  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true){
        const {done,value} = await reader.read()

        if(done){
            throw new Error('AI流在收到完成事件前断开')
        }

        buffer += decoder.decode(value,{stream:true})

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for(const event of events){
            const dataLine = event.split('\n').find((line) => line.startsWith('data:')) 

            if(!dataLine) continue

            const rawData = JSON.parse(dataLine.slice(5).trim()) as LegacySSEData

            const chunk = parseChunk(rawData)
            onChunk(chunk)

            if(chunk.type === 'error'){
                throw new Error(chunk.error?.message)
            }

            if(chunk.type === 'done'){
                return 
            }
        }
    }
  }finally{
    reader.releaseLock()
  }
}
