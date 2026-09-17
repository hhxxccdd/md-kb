<template>
  <el-drawer
    :model-value="visible"
    title="Markdown 质量检查"
    size="400px"
    @close="emit('close')"
  >
    <div
      v-if="status === 'checking'"
      class="quality-state"
    >
      <el-icon class="is-loading" size="24">
        <Loading />
      </el-icon>

      <span>正在检查 Markdown 文档…</span>
    </div>

    <el-alert
      v-else-if="status === 'failed'"
      type="error"
      :title="error ?? '质量检查失败'"
      :closable="false"
      show-icon
    />

    <template v-else>
      <el-alert
        v-if="status === 'stale'"
        type="warning"
        title="文档内容已经变化，当前检查结果可能已过期"
        :closable="false"
        show-icon
      />

      <div
        v-if="aiStatus === 'checking'"
        class="quality-ai-state"
      >
        <el-icon class="is-loading">
          <Loading />
        </el-icon>

        <span>规则检查已完成，AI 正在分析内容质量…</span>
      </div>

      <el-alert
        v-else-if="aiStatus === 'failed'"
        class="quality-ai-error"
        type="warning"
        :title="aiError ?? 'AI 检查失败，当前仅展示规则检查结果'"
        :closable="false"
        show-icon
      />

      <div class="quality-summary">
        <span>共发现 {{ summary.total }} 个问题</span>

        <span v-if="summary.errorCount">
          {{ summary.errorCount }} 个错误
        </span>

        <span v-if="summary.warningCount">
          {{ summary.warningCount }} 个警告
        </span>

        <span v-if="summary.suggestionCount">
          {{ summary.suggestionCount }} 条建议
        </span>
      </div>

      <el-empty
        v-if="
          status === 'completed' &&
          aiStatus !== 'checking' &&
          issues.length === 0
        "
        description="暂未发现 Markdown 质量问题"
      />

      <article
        v-for="issue in issues"
        :key="issue.id"
        class="quality-issue"
      >
        <div class="quality-issue__header">
          <el-tag
            :type="
              issue.severity === 'error'
                ? 'danger'
                : issue.severity === 'warning'
                  ? 'warning'
                  : 'info'
            "
            size="small"
          >
            {{
              issue.severity === "error"
                ? "错误"
                : issue.severity === "warning"
                  ? "警告"
                  : "建议"
            }}
          </el-tag>

          <el-tag
            :type="issue.source === 'ai' ? 'primary' : 'info'"
            effect="plain"
            size="small"
          >
            {{ issue.source === "ai" ? "AI" : "规则" }}
          </el-tag>

          <strong>{{ issue.title }}</strong>
        </div>

        <p class="quality-issue__message">
          {{ issue.message }}
        </p>

        <code v-if="issue.excerpt" class="quality-issue__excerpt">
          {{ issue.excerpt }}
        </code>

        <p
          v-if="issue.suggestion"
          class="quality-issue__suggestion"
        >
          {{ issue.suggestion }}
        </p>

        <div class="quality-issue__footer">
          <span v-if="issue.location">
            第 {{ issue.location.line }} 行
          </span>

          <el-button
            v-if="issue.location"
            text
            type="primary"
            @click="emit('locate', issue)"
          >
            定位
          </el-button>
        </div>
      </article>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";

import type {
  MarkdownQualityIssue,
} from "../types/markdownQuality";

import type {
  AIQualityStatus,
  MarkdownQualityStatus,
} from "../composables/useMarkdownQualityCheck";

defineProps<{
  visible: boolean;
  status: MarkdownQualityStatus;
  aiStatus: AIQualityStatus;
  issues: MarkdownQualityIssue[];
  error: string | undefined;
  aiError: string | undefined;

  summary: {
    total: number;
    errorCount: number;
    warningCount: number;
    suggestionCount: number;
  };
}>();

const emit = defineEmits<{
  close: [];
  locate: [issue: MarkdownQualityIssue];
}>();
</script>

<style scoped>
.quality-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 160px;
  color: #64748b;
}

.quality-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  color: #64748b;
  font-size: 13px;
}

.quality-ai-state {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f0f7ff;
  color: #409eff;
  font-size: 13px;
}

.quality-ai-error {
  margin: 12px 0 16px;
}

.quality-issue {
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
}

.quality-issue__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quality-issue__message,
.quality-issue__suggestion {
  margin: 10px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.quality-issue__excerpt {
  display: block;
  margin-top: 10px;
  padding: 8px;
  overflow: hidden;
  border-radius: 6px;
  background: #f8fafc;
  color: #334155;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quality-issue__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  color: #94a3b8;
  font-size: 12px;
}
</style>
