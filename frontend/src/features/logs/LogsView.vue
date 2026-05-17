<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import { logsApi, type LogEntry, type ActionCount } from '@/services/logs.api'
import { formatDate } from '@/utils/date'

const logs = ref<LogEntry[]>([])
const actions = ref<ActionCount[]>([])
const total = ref(0)
const page = ref(0)
const filterAction = ref('')
const pageSize = 40

const actionLabels: Record<string, string> = {
  login: '登录',
  logout: '退出',
  scan_create: '创建扫描',
  scan_delete: '删除扫描',
  token_add: '添加Token',
  token_delete: '删除Token',
  finding_validate: '密钥验证'
}

const columns: Column<LogEntry>[] = [
  { key: 'action', label: '操作', render: (r) => actionLabels[r.action] || r.action },
  { key: 'detail', label: '详情', class: 'font-mono text-xs' },
  { key: 'ip', label: 'IP' },
  { key: 'created_at', label: '时间', render: (r) => formatDate(r.created_at) }
]

async function load() {
  const [logResult, actionResult] = await Promise.all([
    logsApi.list({ page: page.value, pageSize, action: filterAction.value || undefined }),
    logsApi.actions()
  ])
  logs.value = logResult.items
  total.value = logResult.total ?? 0
  actions.value = actionResult
}

onMounted(load)
watch(page, load)
watch(filterAction, () => { page.value = 0; load() })
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="font-mono text-lg font-extrabold">操作日志</h1>
        <span class="font-mono text-xs text-[var(--app-muted)]">共 {{ total }} 条</span>
      </div>

      <!-- Action filter tabs -->
      <div class="flex flex-wrap gap-1">
        <button
          class="border px-3 py-1.5 text-xs font-extrabold transition"
          :class="filterAction === ''
            ? 'border-[var(--app-border)] bg-[var(--app-inverse)] text-[var(--app-inverse-text)]'
            : 'border-[var(--app-border-soft)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:border-[var(--app-border)]'"
          @click="filterAction = ''"
        >
          全部
        </button>
        <button
          v-for="a in actions"
          :key="a.action"
          class="border px-3 py-1.5 text-xs font-extrabold transition"
          :class="filterAction === a.action
            ? 'border-[var(--app-border)] bg-[var(--app-inverse)] text-[var(--app-inverse-text)]'
            : 'border-[var(--app-border-soft)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:border-[var(--app-border)]'"
          @click="filterAction = a.action"
        >
          {{ actionLabels[a.action] || a.action }}
          <span class="ml-1 opacity-50">{{ a.count }}</span>
        </button>
      </div>

      <DataTable
        :columns="columns"
        :rows="logs"
        :row-key="(l: LogEntry) => l.id"
        empty-message="暂无日志"
      />

      <div class="flex justify-center gap-2">
        <BaseButton variant="ghost" size="sm" :disabled="page === 0" @click="page--">上一页</BaseButton>
        <BaseButton variant="ghost" size="sm" :disabled="(page + 1) * pageSize >= total" @click="page++">下一页</BaseButton>
      </div>
    </div>
  </AppLayout>
</template>
