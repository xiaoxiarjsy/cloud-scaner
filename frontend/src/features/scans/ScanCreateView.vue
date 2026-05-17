<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { scansApi } from '@/services/scans.api'

const router = useRouter()

const query = ref('')
const keyword = ref('')
const org = ref('')
const lang = ref('')
const limit = ref(30)
const minEntropy = ref(4.5)
const submitting = ref(false)
const error = ref('')
const activePreset = ref('')

const langOptions = [
  { label: '全部语言', value: '' },
  { label: 'Python', value: 'python' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Go', value: 'go' },
  { label: 'Java', value: 'java' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'PHP', value: 'php' },
  { label: 'Rust', value: 'rust' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' }
]

interface Preset {
  label: string
  desc: string
  keyword: string
  lang: string
  limit: number
  autoValidate?: boolean
  rules?: string[]
}

const presets: Preset[] = [
  { label: 'OpenAI / DeepSeek', desc: '搜索 + 自动验证 sk- 密钥', keyword: 'sk-', lang: '', limit: 30, autoValidate: true, rules: ['OpenAI API Key', 'DeepSeek API Key', 'DeepSeek Key with Context'] },
  { label: 'Anthropic API Key', desc: '搜索 + 自动验证 Anthropic', keyword: 'sk-ant-', lang: '', limit: 30, autoValidate: true, rules: ['Anthropic API Key'] },
  { label: 'Google API Key', desc: '搜索 + 自动验证 Google', keyword: 'AIza', lang: '', limit: 30, autoValidate: true, rules: ['Google API Key'] },
  { label: 'AWS Access Key', desc: '搜索 AKIA 开头的 AWS 密钥', keyword: 'AKIA', lang: '', limit: 30 },
  { label: 'GitHub Token', desc: '搜索 gh_ 开头的 GitHub 令牌', keyword: 'ghp_', lang: '', limit: 30 },
  { label: 'Stripe Secret Key', desc: '搜索 sk_live_ 生产密钥', keyword: 'sk_live_', lang: '', limit: 30 },
  { label: 'Slack Bot Token', desc: '搜索 xoxb- Bot Token', keyword: 'xoxb-', lang: '', limit: 30 },
  { label: 'Private Key (PEM)', desc: '搜索 PEM 格式私钥', keyword: 'BEGIN PRIVATE KEY', lang: '', limit: 30 },
  { label: '全部密钥 (大范围)', desc: '搜索所有类型密钥', keyword: 'api_key', lang: '', limit: 50 },
  { label: 'Python 项目密钥', desc: 'Python 项目中的各种密钥', keyword: 'api_key', lang: 'python', limit: 30 },
  { label: 'JS/TS 项目密钥', desc: '前端项目中的各种密钥', keyword: 'api_key', lang: 'javascript', limit: 30 }
]

const activeAutoValidate = ref(false)
const activeRules = ref<string[] | undefined>()
const skipHistory = ref(false)

function applyPreset(p: Preset) {
  activePreset.value = p.label
  keyword.value = p.keyword
  lang.value = p.lang
  limit.value = p.limit
  query.value = ''
  org.value = ''
  minEntropy.value = 4.5
  activeAutoValidate.value = !!p.autoValidate
  activeRules.value = p.rules
}

async function submit() {
  if (!query.value && !keyword.value) {
    error.value = '请输入查询语句或关键词'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const result = await scansApi.create({
      query: query.value || undefined,
      keyword: keyword.value || undefined,
      org: org.value || undefined,
      lang: lang.value || undefined,
      limit: limit.value,
      minEntropy: minEntropy.value,
      autoValidate: activeAutoValidate.value,
      skipHistory: skipHistory.value,
      rules: activeRules.value
    })
    router.push(`/scans/${result.id}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '创建扫描失败'
  }
  submitting.value = false
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-2xl space-y-6">
      <div class="animate-fade-in-up flex items-center gap-3">
        <button class="text-[var(--app-muted)] hover:text-[var(--app-text)]" @click="router.back()">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="font-mono text-lg font-extrabold">新建扫描</h1>
      </div>

      <!-- Presets -->
      <section class="animate-fade-in-up" style="animation-delay: 80ms;">
        <p class="mb-2 text-xs font-extrabold text-[var(--app-muted)]">快速预设</p>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="(p, index) in presets"
            :key="p.label"
            type="button"
            class="animate-fade-in-up border px-3 py-2.5 text-left transition"
            :class="activePreset === p.label
              ? 'border-[var(--app-border)] bg-[var(--app-inverse)] text-[var(--app-inverse-text)]'
              : 'border-[var(--app-border-soft)] bg-[var(--app-surface)] text-[var(--app-text)] hover:border-[var(--app-border)] hover:bg-[var(--app-subtle)]'
            "
            :style="{ animationDelay: `${120 + index * 45}ms` }"
            @click="applyPreset(p)"
          >
            <p class="text-xs font-extrabold truncate">
              {{ p.label }}
              <span v-if="p.autoValidate" class="ml-1 text-[9px] px-1 border" :class="activePreset === p.label ? 'border-current' : 'border-[var(--valid)]'" :style="{ color: activePreset === p.label ? 'inherit' : 'var(--income)' }">自动验证</span>
            </p>
            <p class="mt-0.5 text-[10px] leading-tight truncate" :class="activePreset === p.label ? 'text-[var(--app-inverse-text)] opacity-60' : 'text-[var(--app-muted)]'">{{ p.desc }}</p>
          </button>
        </div>
      </section>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="animate-fade-in-up" style="animation-delay: 220ms;">
          <label class="mb-1.5 block text-xs font-extrabold text-[var(--app-muted)]">GitHub 搜索查询</label>
          <BaseInput v-model="query" placeholder='例如: "AKIA" language:python org:myorg' />
        </div>

        <div class="animate-fade-in-up grid grid-cols-1 gap-4 sm:grid-cols-2" style="animation-delay: 300ms;">
          <div>
            <label class="mb-1.5 block text-xs font-extrabold text-[var(--app-muted)]">关键词</label>
            <BaseInput v-model="keyword" placeholder="AKIA, api_key, sk-" />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-extrabold text-[var(--app-muted)]">组织/用户</label>
            <BaseInput v-model="org" placeholder="github, microsoft" />
          </div>
        </div>

        <div class="animate-fade-in-up grid grid-cols-1 gap-4 sm:grid-cols-3" style="animation-delay: 380ms;">
          <div>
            <label class="mb-1.5 block text-xs font-extrabold text-[var(--app-muted)]">语言</label>
            <BaseSelect v-model="lang" :options="langOptions" />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-extrabold text-[var(--app-muted)]">文件数量上限</label>
            <BaseInput v-model="limit" type="number" placeholder="30" />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-extrabold text-[var(--app-muted)]">熵阈值</label>
            <BaseInput v-model="minEntropy" type="number" placeholder="4.5" />
          </div>
        </div>

        <!-- Skip history toggle -->
        <label class="animate-fade-in-up flex items-center gap-3 border border-[var(--app-border-soft)] bg-[var(--app-surface)] px-4 py-3 cursor-pointer hover:border-[var(--app-border)] transition" style="animation-delay: 460ms;">
          <input v-model="skipHistory" type="checkbox" class="w-4 h-4 accent-[var(--app-inverse)]" />
          <div>
            <p class="text-sm font-extrabold">跳过历史记录去重</p>
            <p class="text-xs text-[var(--app-muted)]">开启后将扫描所有文件（包括之前扫描过的），关闭则只扫描新文件</p>
          </div>
        </label>

        <p v-if="error" class="animate-fade-in text-sm font-bold" style="color: var(--expense)">{{ error }}</p>

        <BaseButton type="submit" :disabled="submitting" class="animate-fade-in-up w-full" style="animation-delay: 540ms;">
          {{ submitting ? '扫描中...' : '开始扫描' }}
        </BaseButton>
      </form>
    </div>
  </AppLayout>
</template>
