<template>
  <div class="demo">
    <button @click="showDiff">显示 AI 建议</button>
    <button @click="clearDiff">清除建议</button>

    <p>先在下方编辑器选中一段文字，再点击“显示 AI 建议”。</p>
    <div ref="editorRoot" class="editor-root"></div>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";

interface InlineDiff {
  from: number;
  to: number;
  replacement: string;
}

//1.显示AI建议的文本
class AIAddedTextWidget extends WidgetType {
  private readonly text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  toDOM() {
    const element = document.createElement("div");
    element.className = "cm-ai-dff-added";
    element.textContent = this.text;
    return element;
  }
}

//2.定义一种"设置/清除""Diff的信息
const setInlineDiffEffect = StateEffect.define<InlineDiff | undefined>()


//3.将diff数据转换成编辑器装饰
function createDecorations(diff: InlineDiff):DecorationSet {
    return Decoration.set([
        //给原选区添加删除线
        Decoration.mark({
            class: 'cm-ai-dff-removed'
        }).range(diff.from,diff.to),

        //在原选区结尾插入AI建议
        Decoration.widget({
            widget:new AIAddedTextWidget(diff.replacement),
            side:1,
            block:true,
        }).range(diff.to)
    ],true)
}

//4.编辑器内部保存当前diff装饰
const inlineDiffField = StateField.define<DecorationSet>({
    create(){
        return Decoration.none
    },

    update(decorations,transaction){

        //收到"显示/清除diff"的消息
        for(const effect of transaction.effects){
            if(effect.is(setInlineDiffEffect)){
                 return effect.value ? createDecorations(effect.value) : Decoration.none
            }
        }

        // 用户输入、删除、粘贴，正文变了：清除 AI 建议
        if(transaction.docChanged){
            return Decoration.none
        }

        return decorations.map(transaction.changes);
    },

    provide:(field) => EditorView.decorations.from(field)
})


//5.定义红色删除线和紫色建议块的样式
const inlineDiffTheme = EditorView.baseTheme({
    ".cm-ai-diff-removed": {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    textDecoration: "line-through",
  },

  ".cm-ai-diff-added": {
    display: "block",
    margin: "8px 0 8px 12px",
    padding: "6px 8px",
    backgroundColor: "#ede9fe",
    color: "#6d28d9",
    whiteSpace: "pre-wrap",
  },
})

const editorRoot = ref<HTMLElement>()
let view:EditorView | undefined
let hasDiff = false

function clearDiff() {
  hasDiff = false;

  view?.dispatch({
    effects: setInlineDiffEffect.of(undefined),
  });
}

function showDiff() {
  if (!view) return;

  const selection = view.state.selection.main;

  // 必须先选中文字
  if (selection.empty) {
    window.alert("请先选中一段文字");
    return;
  }

  const selectedText = view.state.sliceDoc(selection.from, selection.to);

  hasDiff = true;

  view.dispatch({
    effects: setInlineDiffEffect.of({
      from: selection.from,
      to: selection.to,
      replacement: `AI 建议：${selectedText}（这是一个模拟结果）`,
    }),
  });
}

onMounted(() => {
  const state = EditorState.create({
    doc: "今天天气很好，我们一起去公园散步吧。",
    extensions: [
      inlineDiffField,
      inlineDiffTheme,

      // 用户编辑正文后，使建议失效
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || !hasDiff) return;

        queueMicrotask(() => {
          clearDiff();
          window.alert("文档已修改，AI 建议已失效");
        });
      }),
    ],
  });

  view = new EditorView({
    state,
    parent: editorRoot.value,
  });
});

onBeforeUnmount(() => {
  view?.destroy();
});



</script>
<style scoped>
.editor-root {
  min-height: 180px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 12px;
}

button {
  margin-right: 8px;
}
</style>
