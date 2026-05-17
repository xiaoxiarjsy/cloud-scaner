<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Home, Search, Shield, ScrollText, Settings, LogOut, Moon, Sun, Clock } from 'lucide-vue-next'
import BrandMark from '@/components/brand/BrandMark.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useThemeStore } from '@/stores/theme.store'
import { useAuthStore } from '@/stores/auth.store'

const theme = useThemeStore()
const auth = useAuthStore()
const router = useRouter()
const themeMotion = ref(false)
let themeMotionTimer: number | undefined

const navItems = [
  { to: '/', label: '仪表盘', icon: Home },
  { to: '/scans/create', label: '新建扫描', icon: Search },
  { to: '/findings', label: '发现列表', icon: Shield },
  { to: '/rules', label: '规则库', icon: ScrollText }
]

const desktopNavActiveClass = '!border-[var(--app-border)] !bg-[var(--app-inverse)] !text-[var(--app-inverse-text)]'
const mobileNavActiveClass = '!bg-[var(--app-inverse)] !text-[var(--app-inverse-text)]'

onMounted(async () => {
  await auth.loadMe()
})

function setThemeMode(value: 'light' | 'dark') {
  if (theme.mode === value) return
  if (themeMotionTimer) window.clearTimeout(themeMotionTimer)
  themeMotion.value = false
  window.requestAnimationFrame(() => {
    themeMotion.value = true
    themeMotionTimer = window.setTimeout(() => { themeMotion.value = false }, 420)
  })
  theme.mode = value
}

async function signOut() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div
    class="app-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]"
    :class="{ 'app-shell--theme-switching': themeMotion }"
  >
    <!-- Desktop sidebar -->
    <aside class="fixed inset-y-0 left-0 hidden w-20 border-r border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-3 lg:block z-20">
      <div class="mb-4 border-b border-[var(--app-border)] pb-3">
        <div class="flex flex-col items-center gap-2">
          <BrandMark class="h-10 w-10" />
          <p class="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em]">S</p>
        </div>
      </div>

      <nav class="space-y-1 flex-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :title="item.label"
          class="flex h-11 items-center justify-center border border-transparent text-[var(--app-muted)] transition hover:border-[var(--app-border)] hover:bg-[var(--app-subtle)] hover:text-[var(--app-text)]"
          :active-class="item.to === '/' ? '' : desktopNavActiveClass"
          :exact-active-class="desktopNavActiveClass"
        >
          <component :is="item.icon" class="h-4 w-4" />
          <span class="sr-only">{{ item.label }}</span>
        </RouterLink>
        <RouterLink
          to="/logs"
          title="操作日志"
          class="flex h-11 items-center justify-center border border-transparent text-[var(--app-muted)] transition hover:border-[var(--app-border)] hover:bg-[var(--app-subtle)] hover:text-[var(--app-text)]"
          active-class="!border-[var(--app-border)] !bg-[var(--app-inverse)] !text-[var(--app-inverse-text)]"
        >
          <Clock class="h-4 w-4" />
          <span class="sr-only">操作日志</span>
        </RouterLink>
      </nav>

      <!-- Bottom controls -->
      <div class="absolute bottom-3 left-2 right-2 space-y-1">
        <RouterLink
          to="/settings"
          title="设置"
          class="flex h-11 items-center justify-center border border-transparent text-[var(--app-muted)] transition hover:border-[var(--app-border)] hover:bg-[var(--app-subtle)] hover:text-[var(--app-text)]"
          active-class="!border-[var(--app-border)] !bg-[var(--app-inverse)] !text-[var(--app-inverse-text)]"
        >
          <Settings class="h-4 w-4" />
          <span class="sr-only">设置</span>
        </RouterLink>
        <BaseButton variant="ghost" class="h-11 w-full justify-center px-0" title="退出登录" @click="signOut">
          <LogOut class="h-4 w-4" />
          <span class="sr-only">退出登录</span>
        </BaseButton>
      </div>
    </aside>

    <div class="lg:pl-20">
      <!-- Top header -->
      <header class="sticky top-0 z-10 flex min-h-12 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5">
        <div class="flex min-w-0 items-center gap-2">
          <BrandMark class="h-8 w-8 shrink-0 lg:hidden" />
          <div class="min-w-0">
            <p class="hidden font-mono text-[10px] font-extrabold uppercase text-[var(--app-muted)] sm:block">leak scan</p>
            <p class="truncate text-sm font-extrabold">泄露扫描系统</p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span v-if="auth.user" class="hidden text-xs font-bold text-[var(--app-muted)] sm:inline">
            {{ auth.user.email }}
          </span>
          <div
            class="theme-toggle"
            :class="theme.mode === 'dark' ? 'theme-toggle--dark' : 'theme-toggle--light'"
            role="group"
            aria-label="主题模式"
          >
            <span class="theme-toggle__thumb" aria-hidden="true"></span>
            <button
              type="button"
              class="theme-toggle__button"
              :class="{ 'theme-toggle__button--active': theme.mode === 'light' }"
              title="亮色"
              :aria-pressed="theme.mode === 'light'"
              @click="setThemeMode('light')"
            >
              <Sun class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="theme-toggle__button"
              :class="{ 'theme-toggle__button--active': theme.mode === 'dark' }"
              title="暗色"
              :aria-pressed="theme.mode === 'dark'"
              @click="setThemeMode('dark')"
            >
              <Moon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <!-- Main content -->
      <main class="route-transition-frame w-full px-3 py-3 pb-20 lg:pb-3">
        <slot />
      </main>
    </div>

    <!-- Mobile bottom nav -->
    <nav class="fixed bottom-0 left-0 right-0 grid grid-cols-5 border-t border-[var(--app-border)] bg-[var(--app-surface)] lg:hidden z-20">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex h-14 flex-col items-center justify-center gap-1 border-r border-[var(--app-border-soft)] text-xs font-bold text-[var(--app-muted)]"
        :active-class="item.to === '/' ? '' : mobileNavActiveClass"
        :exact-active-class="mobileNavActiveClass"
      >
        <component :is="item.icon" class="h-4 w-4" />
        {{ item.label }}
      </RouterLink>
      <RouterLink
        to="/settings"
        class="flex h-14 flex-col items-center justify-center gap-1 text-xs font-bold text-[var(--app-muted)]"
        active-class="!bg-[var(--app-inverse)] !text-[var(--app-inverse-text)]"
      >
        <Settings class="h-4 w-4" />
        设置
      </RouterLink>
    </nav>
  </div>
</template>
