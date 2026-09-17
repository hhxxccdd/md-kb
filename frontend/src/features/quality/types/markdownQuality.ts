export type MarkdownQualitySeverity = "error" | "warning" | "suggestion";

export type MarkdownQualitySource = "rule" | "ai";

export type MarkdownQualityCategory =
  | "heading"
  | "code"
  | "link"
  | "list"
  | "format"
  | "content";

export interface MarkdownQualityLocation {
  //CodeMirror 文档位置，用from，to标注
  from: number;
  to: number;

  //给用户展示的位置，从1开始
  line: number;
  column: number;
}

export interface MarkdownQualityIssue {
  id: string;

  //确定的规则名称：例如heading-level-jump
  ruleId: string;

  source: MarkdownQualitySource;
  severity: MarkdownQualitySeverity;
  category: MarkdownQualityCategory;

  title: string;
  message: string;
  suggestion?: string;

  //文档问题可以暂时没有具体位置
  location?: MarkdownQualityLocation;

  //用于问题面板展示附近原文
  excerpt: string;
}

export type AIMarkdownQualityCategory =
  | "structure"
  | "clarity"
  | "consistency"
  | "duplication";

export interface AIMarkdownQualityIssue {
  severity: "warning" | "suggestion";
  category: AIMarkdownQualityCategory;

  line: number;

  title: string;
  message: string;
  suggestion: string;
  excerpt: string;
}

export interface AIMarkdownQualityResult {
  issues: AIMarkdownQualityIssue[];
}
