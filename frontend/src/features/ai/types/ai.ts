export type AIActionType = 'polish' | 'translate'

export interface AIFeatureConfig {
  key: AIActionType
  title: string
  url: string
}

export type AIActionStatus = 
    | 'idle'
    | 'streaming'
    | 'completed'
    | 'cancelled'
    | 'failed'

export type AIErrorKind = 
    | 'cancelled'
    | 'network'
    | 'timeout'
    | 'unauthorized'
    | 'rate-limit'
    | 'server'
    | 'parse'
   
export interface AIActionError {
    kind:AIErrorKind
    message:string
    retryable:boolean
}

export interface AIStreamChunk {
    type: 'token' | 'done' | 'error'
    text?:string
    error?:AIActionError
}

export interface AIRequestOptions {
    url:string
    payload:Record<string,unknown>
    signal:AbortSignal
    onChunk: (chunk:AIStreamChunk) => void
}

export interface AISelectionHint {
    text:string
    from:number
    to:number
    position:{
        top:number
        left:number
    }
}

export interface AIReviewSession {
    action:AIActionType

    //发送给AI的输入
    inputText:string

    //提交修改前，期望编辑器的原文
    expectedText:string
   
    from:number
    to:number
    position: {
        top:number
        left:number
    }
    targetLanguage?:string
}
