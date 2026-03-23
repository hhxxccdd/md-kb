//对AI弹窗进行类型描述
export interface AIFeatureConfig{
    key:string     //功能唯一标识
    label:string   //按钮显示文字
    path:string    //后端接口路径（如/api/ai/polish）
    placeholder:string  //输入框提示语
    needContext?:boolean  //是否需要上下文（文档问答）
}

export interface SSEData{
    status: 'loading'|'done'|'error'
    content:string
}