<template>
  <div class="admin">
    <div class="admin-head">
      <div class="admin-head-title">AI 知识库</div>
      <div class="admin-head-right">
        <el-autocomplete
          v-model="searchKeyword"
          :fetch-suggestions="querySearch"
          :loading="isSearching"
          @select="handleSelect"
          clearable
          class="w-50"
          placeholder="搜索文档..."
        />
        <el-button @click="router.push('/edit')" type="primary" size="default" class="admin-head-right-button">
          新建文档
        </el-button>
        <el-avatar :size="44" :src="userInfo?.avatar" class="admin-head-right-avatar" />
        <div class="admin-head-right-name">
          {{ userInfo?.username }}
        </div>
        <div @click="dialogVisible = true" class="admin-head-right-logout">
          退出
        </div>
      </div>
    </div>

    <div class="admin-content">
      <div class="admin-content-tab">
        <div :class="['admin-content-item',{active: activeTab === 'private'}]" @click="activeTab = 'private'">
          我的私有文档
           <span class="tab-count">{{ privateDocuments.length }}</span>
        </div>
        <div :class="['admin-content-item',{active: activeTab === 'shared'}]" @click="activeTab = 'shared'">
          团队公开文档
           <span class="tab-count">{{ sharedDocuments.length }}</span>
        </div>
      </div>

      <div class="admin-content-docList">
        <div class="admin-content-docList-grid">
         <DocumentCard  v-for = "doc in currentDocs" :key="doc.id" :doc="doc" @refresh="loadDocuments" />
        </div>
      </div>
    </div>
  </div>


  <!-- 退出弹窗 -->
   <el-dialog
    v-model="dialogVisible"
    title="提示"
    width="500"
  >
    <span>你确定要退出登录吗？</span>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="logout">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
  
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/user'
import { useRouter } from 'vue-router';
import { computed, ref,onMounted } from 'vue'
import { getPrivateDocuments,getSharedDocuments} from '../api';
import { useDocumentSearch } from '../features/documents/composables/useDocumentSearch';
import type { DocumentItem,SharedDocumentItem } from '../api';
//引入卡片组件
import DocumentCard from '../component/card/documentCard.vue';

const userInfo = useAuthStore().userInfo
const router = useRouter()

const activeTab = ref<'private' | 'shared'>('private')
const dialogVisible = ref(false)
const privateDocuments =  ref<DocumentItem[]>([])
const sharedDocuments  =  ref<SharedDocumentItem[]>([])

const searchKeyword = ref('')

const {isSearching,querySearch} = useDocumentSearch()





const handleSelect = (item: Record<string, unknown>) => {
  const selectedDocument = item.doc

  if (
    !selectedDocument ||
    typeof selectedDocument !== 'object' ||
    !('id' in selectedDocument) ||
    typeof selectedDocument.id !== 'number'
  ) {
    return
  }

  router.push(`/edit/${selectedDocument.id}`)
}


//退出方法
const logout = () => {
   dialogVisible.value = false
   useAuthStore().logout()
}


//文档列表根据Tab切换
const currentDocs = computed(() => {
   return activeTab.value === 'private' ? privateDocuments.value : sharedDocuments.value
})

const loadDocuments = async () => {
//根据id查询私有文档与公开文档
   try {
      const privateRes = await getPrivateDocuments()
      privateDocuments.value = privateRes.data

      const shareRes = await getSharedDocuments()
      sharedDocuments.value = shareRes.data
   } catch {
      // request 拦截器已经统一提示错误。
   }
}


onMounted(loadDocuments)

</script>

<style scoped>
.admin{
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

.admin-head{
    display: flex;
    background-color: #ffffff;
    height: 64px;
    justify-content: space-between;
    align-items: center;
    padding: 0 28px;
}

.admin-head-title{
    height: 100%;
    min-width: 120px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    font-weight: 700;
    font-size: large;
}

.admin-head-right{
    display: flex;
    align-items: center;
    gap: 18px;
}

.admin-head-right :deep(.el-autocomplete) {
    width: 272px;
}

.admin-head-right :deep(.el-input__wrapper) {
    height: 40px;
}

.admin-head-right-button{
    height: 40px;
    padding: 0 20px;
}

.admin-head-right-avatar{
    flex: 0 0 auto;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 8px rgba(29, 33, 41, 0.08);
}

.admin-head-right-name{
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
    font-weight: 500;
    color: #1d2129;
    white-space: nowrap;
}

.admin-head-right-logout{
    background: transparent;
    border: none;
    font-size: 14px;
    color: #4e5969;
    cursor: pointer;
    transition: all 0.2s;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
}

.admin-head-right-logout:hover {
    color: #1677ff;
    background: #f5f7fa;
}

.admin-head-right-logout.danger:hover {
    color: #ff4d4f;
}

.admin-content{
    height: calc(100% - 64px);
    width: 100%;
    background-color: #f5f7fa;
    padding: 32px 24px;
    overflow: auto;
}

.admin-content-tab{
    display: flex;
    gap:32px;
    margin-bottom: 24px;
    border-bottom: 1px solid #e5e6eb;
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
}

.admin-content-item{
    font-size: 16px;
    font-weight: 600;
    color: #86909c;
    padding-bottom: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
    position: relative;
}

.admin-content-item.active {
    color: #1677ff;
    border-color: #1677ff;
}

.admin-content-item:hover {
    color: #40a9ff;
}

.admin-content-docList{
    margin: 0 auto;
    padding: 0;
    box-sizing: border-box;
    max-width: 1400px;
}

.admin-content-docList-grid{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.tab-count {
  margin-left: 8px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 12px;
  background: #eef6ff;
  color: #1677ff;
}


@media (max-width: 768px) {
    .admin-head {
        padding: 0 12px;
    }

    .admin-head-title {
        min-width: 96px;
    }

    .admin-head-right-button{
        display: none;
    }

    .admin-head-right :deep(.el-autocomplete) {
        display: none;
    }
}
</style>
