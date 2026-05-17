<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
</script>

<template>
  <AppLayout>
    <div class="flex flex-col items-center justify-center py-20">
      <p class="font-mono text-6xl font-extrabold text-[var(--app-border)]">404</p>
      <p class="mt-4 text-sm text-[var(--app-muted)]">页面不存在</p>
      <BaseButton variant="secondary" size="sm" class="mt-6" @click="router.push('/')">返回首页</BaseButton>
    </div>
  </AppLayout>
</template>
