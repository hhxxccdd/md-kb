import type { AIFeatureConfig } from '../type/ai'

export const AI_FEATURES: Record<string, AIFeatureConfig> = {
    polish: { key: 'polish', title: '✨ AI 润色', url: 'http://localhost:3000/api/ai/polish' },
    translate: { key: 'translate', title: '🌐 AI 翻译', url: 'http://localhost:3000/api/ai/translate' },
    answerDoc: { key: 'answerDoc', title: '💬 文档问答', url: 'http://localhost:3000/api/ai/answer-doc' },
}