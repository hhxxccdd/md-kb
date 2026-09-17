import { computed, onScopeDispose, ref } from "vue";

import { checkMarkdownRules } from "../rules/checkMarkdownRules";
import { checkMarkdownQualityWithAI } from "../api/checkMarkdownQuality";
import { normalizeAIQualityIssues } from "../utils/normalizeAIQualityIssues";

import type { MarkdownQualityIssue } from "../types/markdownQuality";

export type MarkdownQualityStatus =
  | "idle"
  | "checking"
  | "completed"
  | "failed"
  | "stale";

export type AIQualityStatus =
  | "idle"
  | "checking"
  | "completed"
  | "failed";

export function useMarkdownQualityCheck() {
  // 本地规则检查的状态
  const status = ref<MarkdownQualityStatus>("idle");

  // AI 检查单独维护状态
  const aiStatus = ref<AIQualityStatus>("idle");

  const issues = ref<MarkdownQualityIssue[]>([]);
  const error = ref<string>();
  const aiError = ref<string>();

  // 保存检查时的正文，用来判断结果是否已经过期
  const checkedContent = ref("");

  // 区分连续执行的多次检查
  let checkId = 0;

  // 当前 AI 请求的取消控制器
  let activeController: AbortController | undefined;

  const summary = computed(() => {
    let errorCount = 0;
    let warningCount = 0;
    let suggestionCount = 0;

    for (const issue of issues.value) {
      if (issue.severity === "error") {
        errorCount += 1;
      } else if (issue.severity === "warning") {
        warningCount += 1;
      } else {
        suggestionCount += 1;
      }
    }

    return {
      total: issues.value.length,
      errorCount,
      warningCount,
      suggestionCount,
    };
  });

  function cancelActiveRequest() {
    activeController?.abort();
    activeController = undefined;
  }

  function isCancelledError(reason: unknown) {
    if (reason instanceof DOMException && reason.name === "AbortError") {
      return true;
    }

    return (
      typeof reason === "object" &&
      reason !== null &&
      "code" in reason &&
      reason.code === "ERR_CANCELED"
    );
  }

  async function run(markdown: string) {
    if (!markdown.trim()) {
      reset();
      return;
    }

    // 如果上一次 AI 检查还没结束，先取消
    cancelActiveRequest();

    const currentCheckId = ++checkId;

    status.value = "checking";
    aiStatus.value = "idle";

    issues.value = [];
    error.value = undefined;
    aiError.value = undefined;

    let ruleIssues: MarkdownQualityIssue[];

    // 第一阶段：本地确定性规则检查
    try {
      ruleIssues = await checkMarkdownRules(markdown);

      if (currentCheckId !== checkId) {
        return;
      }

      issues.value = ruleIssues;
      checkedContent.value = markdown;
      status.value = "completed";
    } catch (reason) {
      if (currentCheckId !== checkId) {
        return;
      }

      error.value =
        reason instanceof Error
          ? reason.message
          : "Markdown 规则检查失败";

      status.value = "failed";
      return;
    }

    // 第二阶段：AI 语义检查
    const controller = new AbortController();
    activeController = controller;
    aiStatus.value = "checking";

    try {
      const response = await checkMarkdownQualityWithAI(
        markdown,
        controller.signal,
      );

      // 检查期间又执行了新任务，丢弃旧结果
      if (
        currentCheckId !== checkId ||
        controller.signal.aborted
      ) {
        return;
      }

      const aiIssues = normalizeAIQualityIssues(
        markdown,
        response.data.issues,
      );

      // 在规则结果后面追加 AI 结果
      issues.value = [...ruleIssues, ...aiIssues];
      aiStatus.value = "completed";
    } catch (reason) {
      if (
        currentCheckId !== checkId ||
        isCancelledError(reason)
      ) {
        return;
      }

      // AI 失败不影响已经生成的规则结果
      aiError.value =
        reason instanceof Error
          ? reason.message
          : "AI 语义检查失败";

      aiStatus.value = "failed";
    } finally {
      if (activeController === controller) {
        activeController = undefined;
      }
    }
  }

  function markStale(currentContent: string) {
    if (
      currentContent !== checkedContent.value &&
      (status.value === "completed" ||
        aiStatus.value === "checking")
    ) {
      // 让旧的异步结果失效
      checkId += 1;
      cancelActiveRequest();

      status.value = "stale";
      aiStatus.value = "idle";
    }
  }

  function reset() {
    checkId += 1;
    cancelActiveRequest();

    status.value = "idle";
    aiStatus.value = "idle";

    issues.value = [];
    error.value = undefined;
    aiError.value = undefined;
    checkedContent.value = "";
  }

  onScopeDispose(cancelActiveRequest);

  return {
    status,
    aiStatus,
    issues,
    error,
    aiError,
    summary,
    run,
    markStale,
    reset,
  };
}