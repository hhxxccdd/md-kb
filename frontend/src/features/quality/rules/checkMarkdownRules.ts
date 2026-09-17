import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkLintCorrectMediaSyntax from "remark-lint-correct-media-syntax";
import remarkLintHeadingIncrement from "remark-lint-heading-increment";
import remarkLintNoEmptyUrl from "remark-lint-no-empty-url";
import remarkLintNoMultipleToplevelHeadings from "remark-lint-no-multiple-toplevel-headings";
import remarkLintNoUndefinedReferences from "remark-lint-no-undefined-references";

import type {
  MarkdownQualityCategory,
  MarkdownQualityIssue,
  MarkdownQualitySeverity,
} from "../types/markdownQuality";

interface RuleMetadata {
  title: string;
  category: MarkdownQualityCategory;
  severity: MarkdownQualitySeverity;
  suggestion: string;
}

const RULE_METADATA: Record<string, RuleMetadata> = {
  "heading-increment": {
    title: "标题等级跳跃",
    category: "heading",
    severity: "warning",
    suggestion: "请按顺序调整标题等级，避免跨级",
  },

  "no-multiple-toplevel-headings": {
    title: "存在多个一级标题",
    category: "heading",
    severity: "warning",
    suggestion: "建议只保留一个一级标题",
  },

  "correct-media-syntax": {
    title: "链接或图片语法错误",
    category: "link",
    severity: "error",
    suggestion: "请检查方括号与圆括号是否正确配对。",
  },

  "no-empty-url": {
    title: "链接地址为空",
    category: "link",
    severity: "error",
    suggestion: "请填写有效地址，或者删除无效链接。",
  },

  "no-undefined-references": {
    title: "引用链接未定义",
    category: "link",
    severity: "error",
    suggestion: "请补充对应的引用定义，或者改为普通链接。",
  },
};

const processor = remark()
  .use(remarkGfm)
  .use(remarkLintHeadingIncrement)
  .use(remarkLintNoMultipleToplevelHeadings)
  .use(remarkLintCorrectMediaSyntax)
  .use(remarkLintNoEmptyUrl)
  .use(remarkLintNoUndefinedReferences);

function getLineRange(markdown: string, line: number, column: number) {
  const lines = markdown.split("\n");

  let lineStart = 0;

  for (let index = 0; index < line - 1; index += 1) {
    lineStart += (lines[index]?.length ?? 0) + 1;
  }

  const currentLine = lines[line - 1] ?? "";

  const from = lineStart + Math.max(0, column - 1);

  return {
    from,
    to:lineStart + currentLine.length,
    excerpt:currentLine
  }
}

//对外暴露的检查函数
export async function  checkMarkdownRules(markdown:string):Promise<MarkdownQualityIssue[]> {

    const file = await processor.process(markdown)


    return file.messages.map((message,index) => {
         const ruleId = message.ruleId ?? "unknown";
         const metadata = RULE_METADATA[ruleId];

         const line = message.line ?? 1;
         const column = message.column ?? 1;

         const range = getLineRange(markdown,line,column)

         return {
            id:`${ruleId}-${line}-${column}-${index}`,
            ruleId,
            source:'rule',
            severity: metadata?.severity ?? "warning",
            category: metadata?.category ?? "format",

            title:metadata?.title ?? "Markdown 格式问题",
            message:message.reason,
            suggestion:metadata?.suggestion ?? "请检查此处的markdown格式",

            location:{
                from:range.from,
                to:range.to,
                line,
                column
            },

            excerpt:range.excerpt
            
         }
    })


    
}
