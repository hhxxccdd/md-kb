import type { AIFeatureConfig } from '../types/ai'

export const AI_FEATURES: AIFeatureConfig[] = [
    {
        key: 'polish',
        label: 'AI润色',
        path: '/api/ai/polish',
        placeholder: '请输入需要润色的文本'
    },
    {
        key: 'translate',
        label: 'AI翻译',
        path: '/api/ai/translate',
        placeholder: '请输入需要翻译的文本'
    },
    {
        key: 'generateToc',
        label: '生成目录',
        path: '/api/ai/generate-toc',
        placeholder: '请粘贴文档内容以生成目录'
    },
    {
        key: 'optimizeCode',
        label: '代码优化',
        path: '/api/ai/optimize-code',
        placeholder: '请输入需要优化的代码片段'
    },
    {
        key: 'answerDoc',
        label: '文档问答',
        path: '/api/ai/answer-doc',
        needContext: true,
        placeholder: '请输入你的问题'
    }
]