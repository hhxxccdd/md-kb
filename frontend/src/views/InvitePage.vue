<template>
  <div class="invite-page">
    <header class="invite-head">
      <div class="invite-head-title" @click="router.push('/admin')">AI 知识库</div>
      <div class="invite-head-user">
        <el-avatar :size="40" :src="userInfo?.avatar" />
        <span>{{ userInfo?.username }}</span>
      </div>
    </header>

    <main class="invite-content">
      <section class="invite-panel" v-loading="loading">
        <template v-if="invite">
          <div class="invite-status" :class="statusClass">
            {{ statusText }}
          </div>

          <div class="invite-main">
            <el-avatar :size="56" :src="invite.inviter.avatar" />
            <div class="invite-copy">
              <div class="invite-title">
                {{ invite.inviter.username }} 邀请你协作文档
              </div>
              <div class="invite-doc">
                {{ invite.title }}
              </div>
            </div>
          </div>

          <div class="invite-meta">
            <span>文档 ID：{{ invite.document_id }}</span>
            <span v-if="invite.expires_at">有效期至：{{ formatTime(invite.expires_at) }}</span>
          </div>

          <div class="invite-actions">
            <el-button @click="router.push('/admin')">返回首页</el-button>
            <el-button
              type="primary"
              :loading="accepting"
              :disabled="invite.status !== 'PENDING'"
              @click="handleAccept"
            >
              接受邀请
            </el-button>
          </div>
        </template>

        <template v-else-if="!loading">
          <div class="invite-empty">
            <div class="invite-empty-title">邀请链接不可用</div>
            <div class="invite-empty-text">{{ errorMessage }}</div>
            <el-button type="primary" @click="router.push('/admin')">返回首页</el-button>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { acceptDocumentInvite, getDocumentInvite } from '../api/doc'
import type { DocumentInviteDetail } from '../api/doc'
import { useAuthStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userInfo = useAuthStore().userInfo

const loading = ref(false)
const accepting = ref(false)
const invite = ref<DocumentInviteDetail>()
const errorMessage = ref('请检查邀请链接是否正确')

const token = computed(() => String(route.params.token || '').trim())

const statusText = computed(() => {
  if (!invite.value) return ''
  const statusMap: Record<DocumentInviteDetail['status'], string> = {
    PENDING: '待接受',
    ACCEPTED: '已接受',
    REJECTED: '已拒绝',
    EXPIRED: '已过期',
    CANCELED: '已取消',
  }
  return statusMap[invite.value.status]
})

const statusClass = computed(() => {
  return invite.value?.status.toLowerCase()
})

const formatTime = (value: string) => {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hour}:${minute}`
}

const loadInvite = async () => {
  if (!token.value) return

  loading.value = true
  try {
    const res = await getDocumentInvite(token.value)
    invite.value = res.data
  } catch (err: any) {
    errorMessage.value = err.response?.data?.msg || '邀请信息获取失败'
  } finally {
    loading.value = false
  }
}

const handleAccept = async () => {
  if (!token.value) return

  accepting.value = true
  try {
    const res = await acceptDocumentInvite(token.value)
    ElMessage.success('已加入协作文档')
    router.push(`/edit/${res.data.document_id}`)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.msg || '接受邀请失败')
  } finally {
    accepting.value = false
  }
}

onMounted(loadInvite)
</script>

<style scoped>
.invite-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f5f7fa;
}

.invite-head {
  height: 64px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #eef0f4;
  box-sizing: border-box;
}

.invite-head-title {
  font-size: 18px;
  font-weight: 700;
  color: #1d2129;
  cursor: pointer;
}

.invite-head-user {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 500;
  color: #1d2129;
}

.invite-content {
  height: calc(100% - 64px);
  padding: 56px 24px;
  box-sizing: border-box;
}

.invite-panel {
  width: min(640px, 100%);
  min-height: 288px;
  margin: 0 auto;
  padding: 32px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(29, 33, 41, 0.08);
  box-sizing: border-box;
}

.invite-status {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: #eef6ff;
  color: #1677ff;
}

.invite-status.accepted {
  background: #f0f9eb;
  color: #67c23a;
}

.invite-status.expired,
.invite-status.canceled,
.invite-status.rejected {
  background: #fff1f0;
  color: #f56c6c;
}

.invite-main {
  margin-top: 28px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.invite-copy {
  min-width: 0;
}

.invite-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  line-height: 1.5;
}

.invite-doc {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.invite-meta {
  margin-top: 24px;
  padding-top: 18px;
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  border-top: 1px solid #eef0f4;
  color: #86909c;
  font-size: 14px;
}

.invite-actions {
  margin-top: 32px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.invite-empty {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.invite-empty-title {
  font-size: 20px;
  font-weight: 700;
  color: #1d2129;
}

.invite-empty-text {
  margin: 12px 0 24px;
  color: #86909c;
}

@media (max-width: 768px) {
  .invite-head {
    padding: 0 16px;
  }

  .invite-content {
    padding: 24px 16px;
  }

  .invite-panel {
    padding: 24px;
  }

  .invite-main {
    align-items: flex-start;
  }

  .invite-doc {
    font-size: 21px;
  }
}
</style>
