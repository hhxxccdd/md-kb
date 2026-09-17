import { StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { onScopeDispose, type Ref } from "vue";

interface InlineDiff {
  from: number;
  to: number;
  replacement: string;
}

class AIAddedTextWidget extends WidgetType {
  private readonly text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  eq(other: AIAddedTextWidget) {
    return this.text === other.text;
  }

  toDOM() {
    const element = document.createElement("pre");
    element.className = "cm-ai-diff-added";
    element.textContent = this.text
    return element;
  }
}

const setInlineDiffEffect = StateEffect.define<InlineDiff | undefined>();

function createDecorations(diff: InlineDiff): DecorationSet {
  const decorations = [];

  if (diff.from < diff.to) {
    decorations.push(
      Decoration.mark({
        class: "cm-ai-diff-removed",
      }).range(diff.from, diff.to),
    );
  }

  if (diff.replacement) {
    decorations.push(
      Decoration.widget({
        widget: new AIAddedTextWidget(diff.replacement),
        side: 1,
        block: true,
      }).range(diff.to),
    );
  }

  return Decoration.set(decorations, true);
}

const inlineDiffField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },

  update(decorations, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setInlineDiffEffect)) {
        return effect.value ? createDecorations(effect.value) : Decoration.none;
      }
    }

    // 文档发生任何改变后，候选稿不再可信。
    if (transaction.docChanged) {
      return Decoration.none;
    }

    return decorations.map(transaction.changes);
  },

  provide: (field) => EditorView.decorations.from(field),
});

const inlineDiffTheme = EditorView.baseTheme({
  ".cm-ai-diff-removed": {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    textDecoration: "line-through",
  },

  ".cm-ai-diff-added": {
    display: "block",
    margin: "6px 0 6px 12px",
    padding: "4px 6px",
    backgroundColor: "#ede9fe",
    color: "#6d28d9",
    fontFamily: "inherit",
    fontSize: "inherit",
    whiteSpace: "pre-wrap",
  },
});

export function useAIInlineDiff(
  editorView: Ref<EditorView | undefined>,
  onStale: () => void,
) {
  const installedViews = new WeakSet<EditorView>();
  let hasInlineDiff = false;

  function clear() {
    hasInlineDiff = false;

    const view = editorView.value;
    if (!view) return;

    view.dispatch({
      effects: setInlineDiffEffect.of(undefined),
    });
  }

  function install(view: EditorView) {
    if (installedViews.has(view)) return;

    installedViews.add(view);

    const staleListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged || !hasInlineDiff) return;

      // 不能在 update listener 内直接 dispatch，放到本轮更新结束后。
      queueMicrotask(() => {
        if (!hasInlineDiff) return;

        clear();
        onStale();
      });
    });

    view.dispatch({
      effects: StateEffect.appendConfig.of([
        inlineDiffField,
        inlineDiffTheme,
        staleListener,
      ]),
    });
  }

  function render(diff: InlineDiff) {
    const view = editorView.value;
    if (!view) return;

    if (
      diff.from < 0 ||
      diff.to < diff.from ||
      diff.to > view.state.doc.length
    ) {
      return;
    }

    install(view);
    hasInlineDiff = true;

    view.dispatch({
      effects: setInlineDiffEffect.of(diff),
    });
  }

  onScopeDispose(clear);

  return {
    render,
    clear,
  };
}
