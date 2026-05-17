<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Download, FileJson, FileSpreadsheet, ShieldCheck, Trash2, CheckSquare, Square } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import SeverityBadge from '@/components/ui/SeverityBadge.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useConfirm } from '@/composables/useConfirm'
import { findingsApi } from '@/services/findings.api'
import { formatDate } from '@/utils/date'
import { severityLabel, validationLabel, validationColor } from '@/utils/severity'
import type { Finding } from '@/types/domain'

const router = useRouter()
const { confirm } = useConfirm()
const findings = ref<Finding[]>([])
const total = ref(0)
const page = ref(0)
const pageSize = 50
const filterSeverity = ref('')
const filterRuleName = ref('')
const filterRepo = ref('')
const filterValidation = ref('')
const loading = ref(false)
const verifying = ref(false)
const verifyMessage = ref('')
const selectedIds = ref<Set<string>>(new Set())
const showExport = ref(false)

const severityOptions = [
  { label: '全部级别', value: '' }, { label: '严重', value: 'critical' }, { label: '高危', value: 'high' }, { label: '中危', value: 'medium' }, { label: '低危', value: 'low' }
]
const validationOptions = [
  { label: '全部状态', value: '' }, { label: '未验证', value: 'unvalidated' }, { label: '有效', value: 'valid' }, { label: '无效', value: 'invalid' }, { label: '不可用', value: 'unavailable' }, { label: '验证失败', value: 'error' }
]

function findingBalance(f: Finding): string {
  if (!f.validation_json) return '-'
  try { const v = JSON.parse(f.validation_json); if (v.balance > 0) return `${v.balance} ${v.currency}`; return v.valid ? '-' : '-' } catch { return '-' }
}

function allSelected(): boolean {
  return findings.value.length > 0 && findings.value.every((f) => selectedIds.value.has(f.id))
}
function toggleSelectAll() {
  if (allSelected()) { findings.value.forEach((f) => selectedIds.value.delete(f.id)) }
  else { findings.value.forEach((f) => selectedIds.value.add(f.id)) }
  selectedIds.value = new Set(selectedIds.value)
}
function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

async function load() {
  loading.value = true
  try {
    const result = await findingsApi.list({ page: page.value, pageSize, severity: filterSeverity.value || undefined, ruleName: filterRuleName.value || undefined, repo: filterRepo.value || undefined, validationStatus: filterValidation.value || undefined })
    findings.value = result.items; total.value = result.total ?? 0; selectedIds.value = new Set()
  } catch { /* */ }
  loading.value = false
}
onMounted(load)
watch([filterSeverity, filterRuleName, filterRepo, filterValidation], () => { page.value = 0; load() })
watch(page, load)

async function verifyAll() {
  verifying.value = true
  verifyMessage.value = ''
  try {
    const r = await findingsApi.verifyAll()
    if (r.total > 0) await load()
    if (r.total === 0) {
      verifyMessage.value = '没有待验证的发现'
    } else if (r.failed > 0) {
      verifyMessage.value = `已处理 ${r.total} 条，成功 ${r.verified} 条，失败 ${r.failed} 条`
    } else {
      verifyMessage.value = `已完成 ${r.verified} 条验证`
    }
  } catch (e: unknown) {
    verifyMessage.value = e instanceof Error ? e.message : '验证失败'
  }
  verifying.value = false
}
async function deleteOne(id: string) {
  const accepted = await confirm({
    title: '删除发现',
    message: '删除后无法恢复，此发现记录会从列表中移除。',
    confirmText: '删除',
    tone: 'danger'
  })
  if (!accepted) return
  await findingsApi.delete(id); await load()
}
async function batchDelete() {
  if (selectedIds.value.size === 0) return
  const accepted = await confirm({
    title: '删除选中发现',
    message: `确认删除选中的 ${selectedIds.value.size} 条发现？此操作无法恢复。`,
    confirmText: '删除',
    tone: 'danger'
  })
  if (!accepted) return
  await findingsApi.batchDelete([...selectedIds.value]); selectedIds.value = new Set(); await load()
}
function goFinding(f: Finding) { router.push(`/findings/${f.id}`) }

function exportJSON() { downloadBlob(JSON.stringify(findings.value, null, 2), 'leak-scan.json', 'application/json') }
function exportCSV() {
  const h = ['severity','rule_name','repo','file_path','line_number','matched_text','validation_status','url','created_at']
  const rows = findings.value.map((f) => h.map((k) => { const v = String((f as any)[k] ?? ''); return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v }).join(','))
  downloadBlob('﻿' + [h.join(','), ...rows].join('\n'), 'leak-scan.csv', 'text/csv')
}
function downloadBlob(data: string, filename: string, mime: string) { const b = new Blob([data],{type:mime}); const u=URL.createObjectURL(b); const a=document.createElement('a');a.href=u;a.download=filename;a.click();URL.revokeObjectURL(u);showExport.value=false }
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="font-mono text-lg font-extrabold">发现列表</h1>
        <div class="flex items-center gap-2 flex-wrap">
          <BaseButton v-if="selectedIds.size > 0" variant="danger" size="sm" @click="batchDelete"><Trash2 class="h-4 w-4" /> 删除选中 ({{ selectedIds.size }})</BaseButton>
          <BaseButton variant="secondary" size="sm" :disabled="verifying" @click="verifyAll"><ShieldCheck class="h-4 w-4" /> {{ verifying ? '验证中...' : '一键验证全部' }}</BaseButton>
          <div class="relative">
            <BaseButton variant="secondary" size="sm" @click="showExport = !showExport"><Download class="h-4 w-4" /> 导出</BaseButton>
            <div v-if="showExport" class="absolute right-0 top-full mt-1 z-30 border border-[var(--app-border)] bg-[var(--app-surface)] p-1 min-w-36">
              <button class="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-[var(--app-text)] hover:bg-[var(--app-subtle)]" @click="exportJSON"><FileJson class="h-4 w-4" /> JSON</button>
              <button class="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-[var(--app-text)] hover:bg-[var(--app-subtle)]" @click="exportCSV"><FileSpreadsheet class="h-4 w-4" /> CSV</button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BaseSelect v-model="filterSeverity" :options="severityOptions" class="h-8 text-xs" />
        <BaseSelect v-model="filterValidation" :options="validationOptions" class="h-8 text-xs" />
        <BaseInput v-model="filterRuleName" placeholder="规则名称" class="h-8 text-xs" />
        <BaseInput v-model="filterRepo" placeholder="仓库搜索" class="h-8 text-xs" />
      </div>

      <p class="text-xs text-[var(--app-muted)]">共 {{ total }} 条</p>
      <p v-if="verifyMessage" class="text-xs font-bold text-[var(--app-muted)]">{{ verifyMessage }}</p>

      <!-- Custom table with checkboxes -->
      <div v-if="!loading" class="overflow-x-auto border border-[var(--app-border)]">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-[var(--app-border)] bg-[var(--app-subtle)]">
              <th class="px-3 py-2 w-10 cursor-pointer" @click="toggleSelectAll">
                <CheckSquare v-if="allSelected()" class="h-4 w-4" />
                <Square v-else class="h-4 w-4" />
              </th>
              <th class="px-3 py-2 font-mono text-xs font-extrabold text-[var(--app-muted)]">级别</th>
              <th class="px-3 py-2 font-mono text-xs font-extrabold text-[var(--app-muted)]">规则</th>
              <th class="px-3 py-2 font-mono text-xs font-extrabold text-[var(--app-muted)]">仓库</th>
              <th class="px-3 py-2 font-mono text-xs font-extrabold text-[var(--app-muted)]">文件</th>
              <th class="px-3 py-2 font-mono text-xs font-extrabold text-[var(--app-muted)]">匹配</th>
              <th class="px-3 py-2 font-mono text-xs font-extrabold text-[var(--app-muted)]">验证</th>
              <th class="px-3 py-2 font-mono text-xs font-extrabold text-[var(--app-muted)]">余额</th>
              <th class="px-3 py-2 font-mono text-xs font-extrabold text-[var(--app-muted)]">时间</th>
              <th class="px-3 py-2 w-10 font-mono text-xs font-extrabold text-[var(--app-muted)]"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="findings.length === 0"><td :colspan="10" class="px-3 py-8 text-center text-sm text-[var(--app-muted)]">暂无发现</td></tr>
            <tr v-for="(f, i) in findings" :key="f.id" class="border-b border-[var(--app-border-soft)] transition-colors hover:bg-[var(--app-subtle)]" :style="{ animationDelay: `${i * 30}ms` }" :class="selectedIds.has(f.id) ? 'bg-[var(--app-subtle-strong)]' : 'row-appear'">
              <td class="px-3 py-2 cursor-pointer" @click.stop="toggleSelect(f.id)">
                <CheckSquare v-if="selectedIds.has(f.id)" class="h-4 w-4" />
                <Square v-else class="h-4 w-4" />
              </td>
              <td class="px-3 py-2 cursor-pointer" @click="goFinding(f)"><SeverityBadge :severity="f.severity" /></td>
              <td class="px-3 py-2 cursor-pointer font-medium truncate max-w-[120px]" @click="goFinding(f)">{{ f.rule_name }}</td>
              <td class="px-3 py-2 cursor-pointer font-medium truncate max-w-[150px]" @click="goFinding(f)">{{ f.repo }}</td>
              <td class="px-3 py-2 cursor-pointer font-mono text-xs truncate max-w-[180px]" @click="goFinding(f)">{{ f.file_path }}:{{ f.line_number }}</td>
              <td class="px-3 py-2 font-mono text-xs truncate max-w-[120px]">{{ f.matched_text }}</td>
              <td class="px-3 py-2 cursor-pointer" @click="goFinding(f)">
                <span class="font-mono text-xs font-bold" :style="{ color: validationColor(f.validation_status) }">{{ validationLabel(f.validation_status) }}</span>
              </td>
              <td class="px-3 py-2 font-mono text-xs font-extrabold">
                <span v-if="f.validation_status === 'valid'" style="color: var(--income)">{{ findingBalance(f) }}</span>
                <span v-else class="text-[var(--app-muted)]">-</span>
              </td>
              <td class="px-3 py-2 text-xs text-[var(--app-muted)] whitespace-nowrap">{{ formatDate(f.created_at) }}</td>
              <td class="px-3 py-2">
                <button class="text-[var(--app-muted)] hover:text-[var(--expense)] transition" title="删除" @click.stop="deleteOne(f.id)"><Trash2 class="h-3.5 w-3.5" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-sm text-[var(--app-muted)]">加载中...</div>

      <div class="flex justify-center gap-2">
        <BaseButton variant="ghost" size="sm" :disabled="page === 0" @click="page--">上一页</BaseButton>
        <span class="flex items-center font-mono text-xs text-[var(--app-muted)]">{{ page + 1 }}</span>
        <BaseButton variant="ghost" size="sm" :disabled="(page + 1) * pageSize >= total" @click="page++">下一页</BaseButton>
      </div>
    </div>
  </AppLayout>
</template>
