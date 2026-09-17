import type { AIFeatureConfig, AIActionType } from "../types/ai";

export const AI_FEATURES: Record<AIActionType, AIFeatureConfig> = {
  polish: {
    key: "polish",
    title: "✨ AI 润色",
    url: "http://localhost:3000/api/ai/polish",
  },
  translate: {
    key: "translate",
    title: "🌐 AI 翻译",
    url: "http://localhost:3000/api/ai/translate",
  }
};

export const TRANSLATION_LANGUAGES = [
  { label: "英语", value: "English" },
  { label: "日语", value: "Japanese" },
  { label: "韩语", value: "Korean" },
  { label: "法语", value: "French" },
] as const;
