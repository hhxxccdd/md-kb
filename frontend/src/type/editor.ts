import type { EditorView } from "@codemirror/view";

export interface MarkdownEditorExpose {
  getSelectedText(): string | undefined;

  /**
   * 仅当当前选区仍等于expectedText才替换
   * 返回false表示选区已变化，避免误改文档
   */
  replaceRange(
    from: number,
    to: number,
    expectedText: string,
    replacement: string,
  ): boolean;

  setContent(content: string): void;

  getContent(): string;

  getEditorView(): EditorView | undefined;
}
