import type {
  AIMarkdownQualityIssue,
  MarkdownQualityIssue,
} from "../types/markdownQuality";

export function normalizeAIQualityIssues(
  markdown: string,
  aiIssues: AIMarkdownQualityIssue[],
): MarkdownQualityIssue[] {
  const lines = markdown.split("\n");

  // 提前计算每行在正文中的起始位置
  const lineStarts: number[] = [];
  let offset = 0;

  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }

  const issues: MarkdownQualityIssue[] = [];

  for (const [index, aiIssue] of aiIssues.entries()) {
    const lineIndex = aiIssue.line - 1;
    const currentLine = lines[lineIndex];
    const lineStart = lineStarts[lineIndex];
    const evidence = aiIssue.excerpt.trim();

    // 行号必须有效，证据不能为空
    if (
      !Number.isInteger(aiIssue.line) ||
      currentLine === undefined ||
      lineStart === undefined ||
      !evidence
    ) {
      continue;
    }

    // AI 给出的原文证据必须出现在指定行
    const evidenceIndex = currentLine.indexOf(evidence);

    if (evidenceIndex === -1) {
      continue;
    }

    issues.push({
      id: `ai-${aiIssue.category}-${aiIssue.line}-${index}`,
      ruleId: `ai-${aiIssue.category}`,
      source: "ai",
      severity: aiIssue.severity,
      category: "content",

      title: aiIssue.title,
      message: aiIssue.message,
      suggestion: aiIssue.suggestion,

      location: {
        from: lineStart + evidenceIndex,
        to: lineStart + evidenceIndex + evidence.length,
        line: aiIssue.line,
        column: evidenceIndex + 1,
      },

      // 现有定位方法用它校验整行，因此保存完整行
      excerpt: currentLine,
    });
  }

  return issues;
}