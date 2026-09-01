import { ref, watch, type WatchStopHandle } from "vue";
import { StateEffect } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { OnlineUser } from "../type/collab";
import { UseCollabSocket } from "./useCollabSocket";
import { useYjsMarkdown } from "./useYjsMarkdown";

type DocumentCollaborationOptions = {
  onLocalChange: () => void;
  onSaved: () => void;
  onConnected: () => void;
  onReconnected: () => void;
};

export const useDocumentCollaboration = (
  options: DocumentCollaborationOptions,
) => {
  const onlineUsers = ref<OnlineUser[]>([]);

  let collab: ReturnType<typeof UseCollabSocket> | null = null;
  let yjsMarkdown: ReturnType<typeof useYjsMarkdown> | null = null;
  let stopOnlineUsersWatch: WatchStopHandle | undefined;
  let stopConnectedWatch: WatchStopHandle | undefined;

  const initialize = (documentId: string, view: EditorView) => {
    if (collab) return;

    collab = UseCollabSocket({
      docId: documentId,
      onYUpdate: (update) => {
        yjsMarkdown?.applyRemoteUpdate(update);
      },
      onSaved: options.onSaved,
      onRecoonect: options.onReconnected,
    });

    yjsMarkdown = useYjsMarkdown({
      initialContent: "",
      onLocalUpdate: (update) => {
        options.onLocalChange();
        collab?.sendYUpdate(update);
      },
    });

    view.dispatch({
      effects: StateEffect.appendConfig.of(yjsMarkdown.collabExtension),
    });

    stopOnlineUsersWatch = watch(
      collab.onlineUsers,
      (users) => {
        onlineUsers.value = users;
      },
      { immediate: true },
    );

    stopConnectedWatch = watch(
      collab.connected,
      (isConnected) => {
        if (isConnected) {
          options.onConnected();
        }
      },
      { immediate: true },
    );

    collab.connect()
  };

  const dispose = () => {
     
    stopOnlineUsersWatch?.()
    stopOnlineUsersWatch = undefined

    stopConnectedWatch?.()
    stopConnectedWatch = undefined

    collab?.close()
    collab = null


    yjsMarkdown?.destroy()
    yjsMarkdown = null

    onlineUsers.value = []

  }

  return {
    onlineUsers,
    initialize,
    dispose
  }



};
