export interface MarkdownEditorExpose {
    getSelectedText(): string | undefined
    replaceSelection(content:string):void
}