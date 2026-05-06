<template>
  <div class="doc" @click="edit">
    <div class="doc-main">
      <div class="doc-head">
        <div class="doc-title">{{ doc.title }}</div>
        <div class="doc-tag-person" v-show = '!doc.is_shared'>私有</div>
        <div class="doc-tag-team" v-show = 'doc.is_shared'>团队公开</div>
      </div>

      <div class="doc-time">更新于 {{ formatTime(doc.updated_at) }}</div>
      <div v-show="doc.is_shared" class="doc-author">作者:{{ username }}</div>
    </div>

    <div class="doc-func">
      <div class="doc-func-item" @click.stop="edit">编辑</div>
      <div class="doc-func-item" @click.stop="open" v-show="!doc.is_shared">设为公开</div>
      <div class="doc-func-item" @click.stop="deleteById" v-show="!doc.is_shared">删除</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import type { DocumentItem } from '../../api/doc'
import { deleteDocument, shareDocument } from '../../api/doc'
import { getUserNameById } from '../../api'
import { onMounted,ref } from 'vue'

const username = ref<string>('')

const router = useRouter()

const props = defineProps<{
  doc: DocumentItem
}>()

const emit = defineEmits<{
  refresh: []
}>()

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const edit = () => {
  router.push(`/edit/${props.doc.id}`)
}

const open = async () => {
  const result = await shareDocument(props.doc.id)
  if (result.data) {
    ElMessage.success('已设置为公共文档')
    emit('refresh')
  }
}

const deleteById = async () => {
  await deleteDocument(props.doc.id)
  ElMessage.success('删除成功')
  emit('refresh')
}


onMounted(async () => {
  const res = await getUserNameById(props.doc.owner_user_id)
  username.value = res.data
})
</script>

<style scoped>
.doc {
  height: 200px;
  padding: 20px 24px;
  box-sizing: border-box;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, transform 0.2s;
}

.doc:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.doc-main {
  flex: 1;
  min-height: 0;
}

.doc-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.doc-title {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  color: #1d2129;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.doc-tag-person {
  flex-shrink: 0;
  height: 24px;
  padding: 2px 8px;
  box-sizing: border-box;
  border-radius: 4px;
  background: #f5f7fa;
  color: #86909c;
  font-size: 12px;
  line-height: 20px;
}

.doc-tag-team {
  flex-shrink: 0;
  height: 24px;
  padding: 2px 8px;
  box-sizing: border-box;
  border-radius: 4px;
  background: #fff7e6;
  color: #fa8c16;
  font-size: 12px;
  line-height: 20px;
}

.doc-time {
  margin-top: 18px;
  font-size: 12px;
  color: #86909c;
}

.doc-author{
    font-size: 12px;
    color:#4e5969;
    margin-top: 14px;
}

.doc-func {
  height: 42px;
  flex-shrink: 0;
  border-top: 1px solid #e5e6eb;
  display: flex;
  align-items: flex-end;
  gap: 20px;
}

.doc-func-item {
  font-size: 16px;
  font-weight: 500;
  color: #86909c;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
  border-bottom: 2px solid transparent;
}

.doc-func-item:hover {
  color: #1677ff;
  background: #f5f7fa;
}
</style>
