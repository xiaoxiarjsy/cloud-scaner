<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import SeverityBadge from '@/components/ui/SeverityBadge.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import { rulesApi } from '@/services/rules.api'
import type { Rule } from '@/types/domain'

const rules = ref<Rule[]>([])
const search = ref('')
const loading = ref(true)

const columns: Column<Rule>[] = [
  { key: 'name', label: '规则名称' },
  { key: 'severity', label: '级别' },
  { key: 'pattern', label: '正则表达式', class: 'font-mono text-xs' },
  { key: 'description', label: '描述' }
]

const filtered = ref<Rule[]>([])

async function load() {
  try {
    rules.value = await rulesApi.list()
    filtered.value = rules.value
  } catch { /* ignore */ }
  loading.value = false
}

function applyFilter() {
  const q = search.value.toLowerCase()
  filtered.value = q
    ? rules.value.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
    : rules.value
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="font-mono text-lg font-extrabold">检测规则库</h1>
        <span class="font-mono text-sm text-[var(--app-muted)]">共 {{ rules.length }} 条规则</span>
      </div>

      <BaseInput v-model="search" placeholder="搜索规则..." class="h-8 text-xs max-w-sm" @input="applyFilter" />

      <div v-if="loading" class="text-sm text-[var(--app-muted)]">加载中...</div>

      <DataTable
        v-else
        :columns="columns"
        :rows="filtered"
        :row-key="(r: Rule) => r.name"
        empty-message="未找到匹配规则"
      >
        <template #cell-severity="{ row }">
          <SeverityBadge :severity="(row as Rule).severity" />
        </template>
      </DataTable>
    </div>
  </AppLayout>
</template>
