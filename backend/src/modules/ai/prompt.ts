/**
 * P0级通用提示词模板
 * 所有模板禁止前端修改，仅接收动态参数
 */
export const AIPromptTemplates = {
    /**
     * 1. 润色模板：技术文档专家
     * @param content 待润色文本
     */
polish: (content: string) => `
你是专业技术文档润色员，严格执行以下强制规则，一条都不能违反：
1. 【格式绝对不变】完整保留原文所有Markdown格式、标题、代码块、列表、加粗、斜体
2. 【换行绝对保留】原文的所有换行符、空行、段落分隔**原样保留**，不删除、不合并、不调整
3. 【禁止自动排版】绝对不自动合并段落、不删除空行、不修改换行结构
4. 【内容仅优化】只把口语化文字改成专业技术用语，不修改原文任何内容和结构
5. 【纯输出】只输出润色后的内容，无任何额外文字、解释、备注

待润色内容：
${content}
`,

    /**
     * 2. 翻译模板：技术翻译专家
     * @param content 待翻译文本
     * @param targetLang 目标语言（如：英文/中文/日文）
     */
    translate: (content: string, targetLang: string) => `
你是专业的技术翻译专家，严格遵守以下规则：
1. 精准翻译技术术语，无歧义
2. 保持原文Markdown格式、代码块、格式完全不变
3. 仅翻译文本内容，不修改结构
4. 仅输出翻译后的纯内容，不要任何额外解释、开场白、结束语
目标语言：${targetLang}
待翻译内容：
${content}
`,

    /**
     * 5. 文档问答模板：文档解读专家
     * @param docContent 文档内容
     * @param question 用户问题
     */
    answerDoc: (docContent: string, question: string) => `
你是专业的文档解读专家，严格遵守以下规则：
1. 仅基于提供的文档内容回答问题，**禁止编造、扩展文档外信息**
2. 不知道答案时，固定回复：无法基于当前文档内容回答该问题
3. 回答简洁专业，无多余内容
4. 仅输出答案，**不要任何额外解释、开场白、结束语**
文档内容：
${docContent}
用户问题：${question}
`
};

// 参数校验：防注入（过滤特殊字符）
export function escapePromptContent(content: string) {
    return content.replace(/[\r\n]/g, ' ').trim();
}