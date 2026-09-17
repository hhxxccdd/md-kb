import type { EditorView } from "@codemirror/view";
import { onScopeDispose, type Ref, ref, watch } from "vue";
import type { AISelectionHint } from "../types/ai";

const MIN_SELECTION_LENGTH = 20;
const SELECTION_DELAY = 400;

export function useAISelectionHint(editorView: Ref<EditorView | undefined>) {
  const hint = ref<AISelectionHint>();

  let timer: number | undefined;
  let attachedView: EditorView | undefined;
  let dismissedSelectionKey: string | undefined;

  function clearTimer() {
    if (timer === undefined) return;

    window.clearTimeout(timer);
    timer = undefined;
  }

  function hide() {
    clearTimer();
    hint.value = undefined;
  }

  function getSelectionKey(from: number, to: number, text: string) {
    return `${from}:${to}:${text}`;
  }

  function dismiss() {
    if (hint.value) {
      dismissedSelectionKey = getSelectionKey(
        hint.value.from,
        hint.value.to,
        hint.value.text,
      );
    }

    hide();
  }

  function inspectSelection() {
    const view = editorView.value;

    if (!view) {
      hide();
      return;
    }

    clearTimer();

    const selection = view.state.selection.main;

    if (selection.empty) {
      dismissedSelectionKey = undefined;
      hide();
      return;
    }

    const text = view.state.sliceDoc(selection.from, selection.to);

    if (text.trim().length < MIN_SELECTION_LENGTH) {
      dismissedSelectionKey = undefined;
      hide();
      return;
    }

    const selectionKey = getSelectionKey(selection.from, selection.to, text);

    if (selectionKey === dismissedSelectionKey) {
      return;
    }

    timer = window.setTimeout(() => {
      const currentView = editorView.value;

      if (!currentView || currentView !== view) return;

      const currentSelection = currentView.state.selection.main;

      const currentText = currentView.state.sliceDoc(
        currentSelection.from,
        currentSelection.to,
      );

      //等待期间用户继续调整了选区，就不显示旧提示
      if (
        currentSelection.empty ||
        currentSelection.from !== selection.from ||
        currentSelection.to !== selection.to ||
        currentText !== text
      ) {
        return;
      }

      const coords = currentView.coordsAtPos(currentSelection.from);

      if (!coords) return;

      hint.value = {
        text,
        from: currentSelection.from,
        to: currentSelection.to,
        position: {
          top: Math.max(8, coords.top - 8),
          left: coords.left,
        },
      };
    }, SELECTION_DELAY);
  }

  function handleMouseDown() {
    hide();
  }

  function handleMouseUp() {
    requestAnimationFrame(inspectSelection);
  }

  function handleKeyUp() {
    requestAnimationFrame(inspectSelection);
  }

  function handleInput() {
    hide();
  }

  function handleBlur() {
    hide();
  }

  function attach(view: EditorView) {
    attachedView = view;

    view.dom.addEventListener("mousedown", handleMouseDown);
    view.dom.addEventListener("mouseup", handleMouseUp);
    view.dom.addEventListener("keyup", handleKeyUp);
    view.dom.addEventListener("input", handleInput);
    view.dom.addEventListener("blur", handleBlur);
  }

  function detach(view: EditorView) {
    view.dom.removeEventListener("mousedown", handleMouseDown);
    view.dom.removeEventListener("mouseup", handleMouseUp);
    view.dom.removeEventListener("keyup", handleKeyUp);
    view.dom.removeEventListener("input", handleInput);
    view.dom.removeEventListener("blur", handleBlur);

    if (attachedView === view) {
      attachedView = undefined;
    }
  }

  watch(editorView,(nextView,previousView) => {
    if(previousView){
        detach(previousView)
    }

    hide()

    if(nextView){
        attach(nextView)
    }
  },{immediate:true})

  onScopeDispose(() => {
    if(attachedView){
        detach(attachedView)
    }

    hide()
  })

  return {
    hint,dismiss,hide
  }
}
