import request from "../../../shared/api/request";

import type { ApiResponse } from
  "../../../shared/types/api";

import type {
  AIMarkdownQualityResult,
} from "../types/markdownQuality";

export function checkMarkdownQualityWithAI(
  content: string,
  signal?: AbortSignal,
): Promise<ApiResponse<AIMarkdownQualityResult>> {
  return request.post(
    "/ai/markdown-quality",
    {
      content,
    },
    {
      signal,

      // 全文 AI 检查可能超过全局默认的 10 秒
      timeout: 35_000,
    },
  );
}
