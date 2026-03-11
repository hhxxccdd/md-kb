export interface ApiResponse{
      code:number,
      data?:unknown,
      msg?:string
}

export const ApiCode = {
    Success: 0,
    Error:-1
} as const