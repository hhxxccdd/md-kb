import { onScopeDispose, ref } from "vue";
import { searchDocuments, type DocumentItem } from "../../../api";

const SEARCH_DEBOUNCE_MS = 300;

export type SearchSuggestion = {
  value: string;
  doc: DocumentItem;
};

type SearchCallback = (results: SearchSuggestion[]) => void;

export function useDocumentSearch() {
  const isSearching = ref(false);
  const searchError = ref<string | null>(null);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let latestRequestId = 0;

  const clearSearchTimer = () => {
    if (!searchTimer) return;

    clearTimeout(searchTimer);
    searchTimer = undefined;
  };

  const dispose = () => {
    clearSearchTimer();
    latestRequestId += 1;
    isSearching.value = false;
  };

  onScopeDispose(dispose);

  const querySearch = (query: string, callback: SearchCallback) => {
    clearSearchTimer();

    const keyWord = query.trim();
    const requestId = ++latestRequestId;

    if (!keyWord) {
      isSearching.value = false;
      searchError.value = null;
      callback([]);
      return;
    }

    searchTimer = setTimeout(async () => {
      searchTimer = undefined;
      isSearching.value = true;
      searchError.value = null;

      try {
        const response = await searchDocuments(keyWord);

        if (requestId !== latestRequestId) return;

        callback(response.data.map((doc) => ({ value: doc.title, doc })));
      } catch {
         if(requestId !== latestRequestId) return

         searchError.value = '搜索失败，请稍后重试'

         callback([])
      } finally {

        if(requestId === latestRequestId){
            isSearching.value = false
        }

      }
    },SEARCH_DEBOUNCE_MS);
  };

  return {
    isSearching,
    searchError,
    querySearch,
  };
}
