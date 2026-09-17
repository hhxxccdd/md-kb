import { computed, ref } from "vue";
import { AI_FEATURES } from "../config/aiFeatures";
import type { AIReviewSession } from "../types/ai";
import { useAIAction } from "./useAIAction";

export function useAIReview() {
  const review = ref<AIReviewSession>();

  const { status, result, error, run, cancel } = useAIAction();

  const visible = computed(() => Boolean(review.value));

  async function execute(session: AIReviewSession) {
    const feature = AI_FEATURES[session.action];

    await run({
      url: feature.url,
      payload: {
        content: session.inputText,
        ...(session.targetLanguage
          ? { targetLang: session.targetLanguage }
          : {}),
      },
    });
  }

  async function start(session: AIReviewSession) {
    review.value = session;

    await execute(review.value);
  }

  async function retry() {
    if (!review.value) return;
    await execute(review.value);
  }

  function close() {
    cancel();
    review.value = undefined;
  }

  return {
    review,
    visible,
    status,
    result,
    error,
    start,
    retry,
    close,
  };
}
