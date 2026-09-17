import { Request, Response } from "express";
import { throwAIError, throwBusinessError } from "../../utils/throwError";
import { success } from "../../utils/response";
import { requestAIOnce } from "./client";
import { AI_CONFIG } from "./config";
import { AIPromptTemplates, normalizePromptContent } from "./prompt";
import type { ChatParams } from "./type";

const MAX_DOCUMENT_LENGTH = 30_000;
const MAX_ISSUES = 5;

const SEVERITIES = new Set(["warning", "suggestion"]);
const CATEGORIES = new Set([
  "structure",
  "clarity",
  "consistency",
  "duplication",
]);

export interface AIMarkdownQualityIssue {
  severity: "warning" | "suggestion";
  category: "structure" | "clarity" | "consistency" | "duplication";
  line: number;
  title: string;
  message: string;
  suggestion: string;
  excerpt: string;
}

const addLineNumbers = (content: string) =>
  content
    .split("\n")
    .map((line, index) => `${index + 1}: ${line}`)
    .join("\n");

const extractResponseContent = (data: any): string => {
  const content =
    data?.output?.choices?.[0]?.message?.content ?? data?.output?.text;

  if (typeof content !== "string" || !content.trim()) {
    throwAIError("AI质量检查返回了空结果", 502);
  }

  return content.trim();
};

const parseResponseJson = (content: string): unknown => {
  const normalized = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(normalized);
  } catch {
    throwAIError("AI质量检查结果格式异常", 502);
  }
};

const readRequiredString = (
  value: unknown,
  maximumLength: number,
): string | undefined => {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  if (!normalized) return undefined;

  return normalized.slice(0, maximumLength);
};

const normalizeIssue = (
  value: unknown,
  lineCount: number,
): AIMarkdownQualityIssue | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const issue = value as Record<string, unknown>;
  const severity = issue.severity;
  const category = issue.category;
  const line = issue.line;

  if (typeof severity !== "string" || !SEVERITIES.has(severity)) {
    return undefined;
  }
  if (typeof category !== "string" || !CATEGORIES.has(category)) {
    return undefined;
  }
  if (!Number.isInteger(line) || Number(line) < 1 || Number(line) > lineCount) {
    return undefined;
  }

  const title = readRequiredString(issue.title, 80);
  const message = readRequiredString(issue.message, 300);
  const suggestion = readRequiredString(issue.suggestion, 300);
  const excerpt = readRequiredString(issue.excerpt, 300);

  if (!title || !message || !suggestion || !excerpt) return undefined;

  return {
    severity: severity as AIMarkdownQualityIssue["severity"],
    category: category as AIMarkdownQualityIssue["category"],
    line: Number(line),
    title,
    message,
    suggestion,
    excerpt,
  };
};

export const checkMarkdownQualityWithAI = async (content: string) => {
  const normalizedContent = normalizePromptContent(content);
  const lineCount = normalizedContent.split("\n").length;
  const prompt = AIPromptTemplates.markdownQuality(
    addLineNumbers(normalizedContent),
  );

  const params: ChatParams = {
    model: AI_CONFIG.MODEL,
    input: { messages: [{ role: "user", content: prompt }] },
    parameters: {
      stream: false,
      result_format: "message",
      // 质量检查需要被程序解析，不能只依赖提示词约束模型输出。
      response_format: {
        type: "json_object",
      },
    },
  };

  const response = await requestAIOnce(params);
  const parsed = parseResponseJson(extractResponseContent(response));

  if (!parsed || typeof parsed !== "object") {
    throwAIError("AI质量检查结果格式异常", 502);
  }

  const rawIssues = (parsed as Record<string, unknown>).issues;
  if (!Array.isArray(rawIssues)) {
    return throwAIError("AI质量检查结果缺少问题列表", 502);
  }

  const issueValues: unknown[] = rawIssues;

  return {
    issues: issueValues
      .slice(0, MAX_ISSUES)
      .map((issue) => normalizeIssue(issue, lineCount))
      .filter((issue): issue is AIMarkdownQualityIssue => Boolean(issue)),
  };
};

export const handleMarkdownQualityCheck = async (
  req: Request,
  res: Response,
) => {
  const content = req.body?.content;

  if (typeof content !== "string" || !content.trim()) {
    throwBusinessError("请传入需要检查的 Markdown 文档");
  }

  if (content.length > MAX_DOCUMENT_LENGTH) {
    throwBusinessError(
      `Markdown 文档不能超过 ${MAX_DOCUMENT_LENGTH} 个字符`,
    );
  }

  const result = await checkMarkdownQualityWithAI(content);
  success(res, result, "Markdown质量检查完成");
};
