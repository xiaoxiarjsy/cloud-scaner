<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '@/components/brand/BrandMark.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '登录失败'
  }
  submitting.value = false
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-4">
    <div class="w-full max-w-sm space-y-8">
      <div class="flex flex-col items-center gap-4">
        <BrandMark class="h-14 w-14" />
        <div class="text-center">
          <p class="font-mono text-sm font-extrabold tracking-[0.18em]">泄露扫描系统</p>
          <p class="mt-1 text-xs text-[var(--app-muted)]">Leak Scan System</p>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-xs font-extrabold text-[var(--app-muted)]">邮箱</label>
          <BaseInput v-model="email" type="email" placeholder="admin@example.com" />
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-extrabold text-[var(--app-muted)]">密码</label>
          <BaseInput v-model="password" type="password" placeholder="••••••••" />
        </div>

        <p v-if="error" class="text-sm font-bold" style="color: var(--expense)">{{ error }}</p>

        <BaseButton type="submit" :disabled="submitting" class="w-full">
          {{ submitting ? '登录中...' : '登录' }}
        </BaseButton>
      </form>
    </div>
  </div>
</template>
