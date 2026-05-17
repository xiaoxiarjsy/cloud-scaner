<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ExternalLink, ShieldCheck, Copy, Check } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import SeverityBadge from '@/components/ui/SeverityBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { findingsApi } from '@/services/findings.api'
import { formatDate } from '@/utils/date'
import { severityLabel, validationLabel, validationColor } from '@/utils/severity'
import type { Finding, ValidationResult } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const findingId = route.params.findingId as string

const finding = ref<Finding | null>(null)
const validating = ref(false)
const validationResult = ref<ValidationResult | null>(null)
const validateError = ref('')
const copied = ref(false)

onMounted(async () => {
  try {
    finding.value = await findingsApi.get(findingId)
    if (finding.value?.validation_json) {
      try { validationResult.value = JSON.parse(finding.value.validation_json) } catch { /* ignore */ }
    }
  } catch { /* 404 */ }
})

async function validate() {
  validating.value = true
  validateError.value = ''
  try {
    const result = await findingsApi.validate(findingId)
    validationResult.value = result
    if (finding.value) finding.value.validation_status = result.validationStatus as Finding['validation_status']
  } catch (e: unknown) {
    validateError.value = e instanceof Error ? e.message : '验证失败'
  }
  validating.value = false
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-3xl space-y-6">
      <div class="flex items-center gap-3">
        <button class="text-[var(--app-muted)] hover:text-[var(--app-text)]" @click="router.back()">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="font-mono text-lg font-extrabold">发现详情</h1>
      </div>

      <div v-if="!finding" class="text-sm text-[var(--app-muted)]">加载中...</div>

      <div v-else class="space-y-6">
        <!-- Key info grid -->
        <div class="grid grid-cols-2 gap-px border border-[var(--app-border)] bg-[var(--app-border)] lg:grid-cols-4">
          <div class="bg-[var(--app-surface)] p-3">
            <p class="text-xs font-bold text-[var(--app-muted)]">严重级别</p>
            <p class="mt-1"><SeverityBadge :severity="finding.severity" /></p>
          </div>
          <div class="bg-[var(--app-surface)] p-3">
            <p class="text-xs font-bold text-[var(--app-muted)]">规则</p>
            <p class="mt-1 font-mono text-sm font-extrabold">{{ finding.rule_name }}</p>
          </div>
          <div class="bg-[var(--app-surface)] p-3">
            <p class="text-xs font-bold text-[var(--app-muted)]">验证状态</p>
            <p class="mt-1 font-mono text-sm font-extrabold" :style="{ color: validationColor(finding.validation_status) }">
              {{ validationLabel(finding.validation_status) }}
            </p>
          </div>
          <div class="bg-[var(--app-surface)] p-3">
            <p class="text-xs font-bold text-[var(--app-muted)]">发现时间</p>
            <p class="mt-1 font-mono text-sm font-extrabold">{{ formatDate(finding.created_at) }}</p>
          </div>
        </div>

        <!-- File info -->
        <div class="border border-[var(--app-border)] bg-[var(--app-surface)] p-4 space-y-3">
          <div>
            <p class="text-xs font-bold text-[var(--app-muted)]">仓库</p>
            <p class="mt-0.5 font-bold">{{ finding.repo }}</p>
          </div>
          <div>
            <p class="text-xs font-bold text-[var(--app-muted)]">文件</p>
            <p class="mt-0.5 font-mono text-sm">{{ finding.file_path }}:{{ finding.line_number }}</p>
          </div>
          <div>
            <a
              :href="finding.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-sm font-bold transition hover:underline"
              :style="{ color: 'var(--transfer)' }"
            >
              在 GitHub 中查看 <ExternalLink class="h-3 w-3" />
            </a>
          </div>
        </div>

        <!-- Matched text -->
        <div class="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-bold text-[var(--app-muted)]">匹配文本（脱敏显示）</p>
            <BaseButton variant="ghost" size="sm" @click="copyText(finding.matched_text)">
              <Check v-if="copied" class="h-3 w-3" />
              <Copy v-else class="h-3 w-3" />
            </BaseButton>
          </div>
          <p class="font-mono text-sm break-all">{{ finding.matched_text }}</p>
        </div>

        <!-- Validation section -->
        <div class="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <p class="text-xs font-bold text-[var(--app-muted)] mb-3">密钥验证</p>

          <div v-if="validationResult" class="space-y-2">
            <p class="text-sm font-bold" :style="{ color: validationResult.valid ? 'var(--valid)' : 'var(--invalid)' }">
              {{ validationResult.valid ? '有效' : '无效' }}
              <span v-if="validationResult.available !== undefined">
                | {{ validationResult.available ? '可用' : '不可用' }}
              </span>
            </p>
            <p v-if="validationResult.balance > 0" class="font-mono text-sm font-extrabold">
              余额: {{ validationResult.balance }} {{ validationResult.currency }}
            </p>
            <p v-if="validationResult.account" class="font-mono text-xs text-[var(--app-muted)]">
              账户: {{ validationResult.account }}
            </p>
            <p v-if="validationResult.remaining !== undefined && validationResult.remaining >= 0" class="font-mono text-xs text-[var(--app-muted)]">
              剩余配额: {{ validationResult.remaining }}
            </p>
          </div>

          <div v-else-if="finding.validation_status === 'unvalidated'">
            <BaseButton :disabled="validating" @click="validate">
              <ShieldCheck class="h-4 w-4" />
              {{ validating ? '验证中...' : '验证密钥' }}
            </BaseButton>
            <p class="mt-2 text-xs text-[var(--app-muted)]">验证将向相应服务发送请求，检查密钥有效性及余额</p>
          </div>

          <p v-if="validateError" class="mt-2 text-sm font-bold" style="color: var(--expense)">{{ validateError }}</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
