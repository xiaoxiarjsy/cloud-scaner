<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Trash2, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useConfirm } from '@/composables/useConfirm'
import { settingsApi, type TokenInfo, type SystemInfo } from '@/services/settings.api'
import { formatDate } from '@/utils/date'

const { confirm } = useConfirm()
const tokens = ref<TokenInfo[]>([])
const system = ref<SystemInfo | null>(null)
const newToken = ref('')
const newLabel = ref('')
const error = ref('')
const adding = ref(false)

onMounted(load)

async function load() {
  const [t, s] = await Promise.all([settingsApi.listTokens(), settingsApi.systemInfo()])
  tokens.value = t
  system.value = s
}

async function addToken() {
  if (!newToken.value.trim()) {
    error.value = '请输入 GitHub Token'
    return
  }
  adding.value = true
  error.value = ''
  try {
    await settingsApi.addToken(newToken.value.trim(), newLabel.value.trim())
    newToken.value = ''
    newLabel.value = ''
    await load()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '添加失败'
  }
  adding.value = false
}

async function toggleToken(tok: TokenInfo) {
  await settingsApi.updateToken(tok.id, { enabled: !tok.enabled })
  await load()
}

async function deleteToken(tok: TokenInfo) {
  const accepted = await confirm({
    title: '删除 GitHub Token',
    message: `确认删除 Token "${tok.label || tok.token_preview}"？删除后后续扫描将不再使用它。`,
    confirmText: '删除',
    tone: 'danger'
  })
  if (!accepted) return
  await settingsApi.deleteToken(tok.id)
  await load()
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-2xl space-y-8">
      <h1 class="font-mono text-lg font-extrabold">设置</h1>

      <!-- GitHub Tokens -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-mono text-sm font-extrabold text-[var(--app-muted)]">GitHub Token 管理</h2>
          <span class="font-mono text-xs text-[var(--app-muted)]">{{ tokens.length }} 个 · {{ system?.tokenCount ?? 0 }} 个启用中</span>
        </div>

        <!-- Add token form -->
        <div class="border border-[var(--app-border)] bg-[var(--app-surface)] p-4 space-y-3">
          <BaseInput v-model="newLabel" placeholder="标签 (可选: 个人账号、工作账号...)" class="h-8 text-xs" />
          <div class="flex gap-2">
            <BaseInput v-model="newToken" type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" class="h-8 text-xs flex-1" />
            <BaseButton variant="primary" size="sm" :disabled="adding" @click="addToken">
              {{ adding ? '添加中...' : '添加' }}
            </BaseButton>
          </div>
          <p v-if="error" class="text-xs font-bold" style="color: var(--expense)">{{ error }}</p>
        </div>

        <!-- Token list -->
        <div v-if="tokens.length === 0" class="border border-[var(--app-border)] p-6 text-center text-sm text-[var(--app-muted)]">
          暂无 Token，请添加至少一个 GitHub Personal Access Token
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="tok in tokens"
            :key="tok.id"
            class="flex items-center justify-between border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3"
            :class="{ 'opacity-50': !tok.enabled }"
          >
            <div class="min-w-0 flex-1">
              <p class="font-mono text-sm font-extrabold">{{ tok.label || tok.token_preview }}</p>
              <p class="text-xs text-[var(--app-muted)]">
                {{ tok.token_preview }}
                <span class="ml-2">使用 {{ tok.use_count }} 次</span>
                <span v-if="tok.last_used_at" class="ml-2">{{ formatDate(tok.last_used_at) }}</span>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2 ml-4">
              <button class="text-[var(--app-muted)] hover:text-[var(--app-text)]" :title="tok.enabled ? '禁用' : '启用'" @click="toggleToken(tok)">
                <ToggleRight v-if="tok.enabled" class="h-5 w-5" style="color: var(--valid)" />
                <ToggleLeft v-else class="h-5 w-5" />
              </button>
              <button class="text-[var(--app-muted)] hover:text-[var(--expense)]" title="删除" @click="deleteToken(tok)">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </AppLayout>
</template>
