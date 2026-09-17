import { onScopeDispose, ref } from "vue";
import { streamAIRequest } from "../api/streamAIRequest";
import type {
  AIActionError,
  AIActionStatus,
  AIRequestOptions,
  AIStreamChunk,
} from "../types/ai";

type RunAIActionOptions = Omit<AIRequestOptions, "signal" | "onChunk">;

function normalizeError(reason: unknown): AIActionError {
  if (reason instanceof DOMException && reason.name === "AbortError") {
    return {
      kind: "cancelled",
      message: "已取消生成",
      retryable: false,
    };
  }

  if (reason instanceof TypeError) {
    return {
      kind: "network",
      message: "网络连接异常，请检查网络后重试",
      retryable: true,
    };
  }

  if (reason instanceof Error) {
    return {
      kind: "server",
      message: reason.message,
      retryable: true,
    };
  }

  return {
    kind: "server",
    message: "AI请求失败,请稍后重试",
    retryable: true,
  };
}

export function useAIAction() {
  const status = ref<AIActionStatus>("idle");
  const result = ref("");
  const error = ref<AIActionError>();

  let activeController: AbortController | undefined;

  function resetResult() {
    result.value = "";
    error.value = undefined;
  }

  function isCurrentRequest(controller: AbortController) {
    return controller === activeController;
  }

  function completed(controller: AbortController) {
    if (!isCurrentRequest(controller)) return;

    activeController = undefined;
    status.value = "completed";
  }

  function fail(controller: AbortController, actionError: AIActionError) {
    if (!isCurrentRequest(controller)) return;

    activeController = undefined;
    error.value = actionError;
    status.value = "failed";
  }

  function handleChunk(controller: AbortController, chunk: AIStreamChunk) {
    if (!isCurrentRequest(controller)) return;

    if(chunk.type === 'token'){
        result.value += chunk.text ?? ''
        return
    }

    if(chunk.type === 'done'){
        completed(controller)
        return
    }

    fail(controller,chunk.error ?? {
        kind: 'server',
        message: 'AI服务异常',
        retryable: true
    })
  }

  function cancel(){
    if(!activeController) return

    activeController.abort()
    activeController = undefined
    status.value = 'cancelled'
  }

  async function run(options:RunAIActionOptions) {

    //新请求开始后，停止旧请求
    cancel()

    const controller = new AbortController()
    activeController = controller
    resetResult()
    status.value = 'streaming'

    try{
        await streamAIRequest({
            ...options,
            signal:controller.signal,
            onChunk: (chunk) => handleChunk(controller,chunk)
        })
    }catch(reason) {
        //旧请求晚到的异常，不能覆盖新请求状态
        if(!isCurrentRequest(controller)) return

        const actionError = normalizeError(reason)

        if(actionError.kind === 'cancelled'){
            activeController = undefined
            status.value = 'cancelled'
            return
        }

        fail(controller,actionError)
    }
  }

  function reset(){
    cancel()
    resetResult()
    status.value = 'idle'
  }

  onScopeDispose(cancel)

  return {
    status,
    result,
    error,
    run,
    cancel,
    reset
  }
}
