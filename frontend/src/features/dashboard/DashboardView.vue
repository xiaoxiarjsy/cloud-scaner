<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import MetricCard from '@/components/ui/MetricCard.vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { statsApi } from '@/services/stats.api'
import { formatRelative } from '@/utils/date'
import { scanStatusLabel, scanStatusColor } from '@/utils/severity'
import type { Stats, Scan } from '@/types/domain'

const router = useRouter()
const stats = ref<Stats | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    stats.value = await statsApi.get()
  } catch { /* ignore */ }
  loading.value = false
})

function goScan(scan: Scan) {
  router.push(`/scans/${scan.id}`)
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="font-mono text-lg font-extrabold">仪表盘</h1>
        <BaseButton size="sm" @click="router.push('/scans/create')">
          <Plus class="h-4 w-4" />
          新建扫描
        </BaseButton>
      </div>

      <!-- Metric cards -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger-1">
        <MetricCard class="animate-fade-in-up" label="扫描总数" :value="String(stats?.totalScans ?? 0)" />
        <MetricCard class="animate-fade-in-up" label="发现总数" :value="String(stats?.totalFindings ?? 0)" tone="warning" />
        <MetricCard class="animate-fade-in-up" label="严重发现" :value="String(stats?.criticalFindings ?? 0)" tone="critical" />
        <MetricCard class="animate-fade-in-up" label="已验证有效" :value="String(stats?.validKeyCount ?? 0)" tone="valid" />
      </div>

      <!-- Severity breakdown -->
      <div v-if="stats" class="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger-1">
        <div
          v-for="sev in ['critical', 'high', 'medium', 'low']"
          :key="sev"
          class="animate-fade-in-up border border-[var(--app-border)] bg-[var(--app-surface)] p-3 card-lift"
        >
          <p class="text-xs font-bold text-[var(--app-muted)]">{{ { critical: '严重', high: '高危', medium: '中危', low: '低危' }[sev] }}</p>
          <p class="mt-1 font-mono text-xl font-extrabold">{{ stats.findingsBySeverity[sev] ?? 0 }}</p>
        </div>
      </div>

      <!-- Recent scans -->
      <section class="animate-fade-in-up">
        <h2 class="mb-3 font-mono text-sm font-extrabold text-[var(--app-muted)]">最近扫描</h2>
        <div v-if="loading" class="text-sm text-[var(--app-muted)]">加载中...</div>
        <div v-else-if="!stats?.recentScans?.length" class="animate-fade-in border border-[var(--app-border)] p-6 text-center text-sm text-[var(--app-muted)]">
          暂无扫描记录，点击"新建扫描"开始
        </div>
        <div v-else class="space-y-1 stagger-1">
          <button
            v-for="(scan, index) in stats.recentScans"
            :key="scan.id"
            class="row-appear flex w-full items-center justify-between border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-left transition hover:bg-[var(--app-subtle)]"
            :style="{ animationDelay: `${index * 80}ms` }"
            @click="goScan(scan)"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-sm font-extrabold">{{ scan.query }}</p>
              <p class="mt-0.5 text-xs text-[var(--app-muted)]">{{ formatRelative(scan.created_at) }}</p>
            </div>
            <div class="ml-4 flex shrink-0 items-center gap-3">
              <span class="font-mono text-sm font-extrabold">{{ scan.progress_findings }} 发现</span>
              <StatusIndicator
                :status="scan.status"
                :label-map="{ pending: '待开始', running: '扫描中', completed: '已完成', failed: '失败', cancelled: '已取消' }"
                :color-map="{ running: 'var(--transfer)', completed: 'var(--valid)', failed: 'var(--invalid)', cancelled: 'var(--muted)' }"
              />
            </div>
          </button>
        </div>
      </section>
    </div>
  </AppLayout>
</template>
