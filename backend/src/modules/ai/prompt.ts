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
你是专业的技术文档专家，严格遵守以下规则：
1. 保持原文Markdown格式、标题层级、代码块完全不变
2. 语言优化为专业、规范、无口语化的技术文档用语
3. 不修改原文核心含义
4. 仅输出润色后的纯内容，**不要任何额外解释、开场白、结束语**
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
     * 3. 目录生成模板：文档结构专家
     * @param content 文档内容
     */
    generateToc: (content: string) => `
你是专业的文档结构专家，严格遵守以下规则：
1. 根据内容生成多级Markdown目录，与标题#层级完全匹配
2. 目录带#锚点链接，格式：- [标题](#标题)
3. 仅输出目录，无其他内容
4. 仅输出纯目录，**不要任何额外解释、开场白、结束语**
文档内容：
${content}
`,

    /**
     * 4. 代码优化模板：前端全栈开发专家
     * @param code 待优化代码
     * @param techStack 技术栈（如：Vue3+TS+JavaScript）
     */
    optimizeCode: (code: string, techStack: string) => `
你是前端全栈开发专家，技术栈：${techStack}，严格遵守以下规则：
1. 优化代码格式、补全规范注释
2. 修复潜在bug，保持原有功能完全不变
3. 不新增/删除功能，仅优化代码质量
4. 仅输出优化后的纯代码，**不要任何额外解释、开场白、结束语**
待优化代码：
${code}
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