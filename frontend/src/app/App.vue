<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useThemeStore } from '@/stores/theme.store'

type EntrancePhase = 'active' | 'reveal' | 'done'

const ENTRANCE_STORAGE_KEY = 'leak-scan-entrance-shown'
const entrancePhase = ref<EntrancePhase>('active')
useThemeStore()
let revealTimer: number | undefined
let doneTimer: number | undefined

onMounted(() => {
  const hasVisited = sessionStorage.getItem(ENTRANCE_STORAGE_KEY)
  if (hasVisited) {
    entrancePhase.value = 'done'
    return
  }

  revealTimer = window.setTimeout(() => { entrancePhase.value = 'reveal' }, 600)
  doneTimer = window.setTimeout(() => {
    entrancePhase.value = 'done'
    sessionStorage.setItem(ENTRANCE_STORAGE_KEY, '1')
  }, 1600)
})

onBeforeUnmount(() => {
  if (revealTimer) window.clearTimeout(revealTimer)
  if (doneTimer) window.clearTimeout(doneTimer)
})
</script>

<template>
  <RouterView />
  <ConfirmDialog />

  <Transition name="app-entrance-overlay">
    <div v-if="entrancePhase !== 'done'" class="app-entrance-overlay" :class="entrancePhase" aria-hidden="true">
      <div class="app-entrance-panel app-entrance-panel--top"></div>
      <div class="app-entrance-panel app-entrance-panel--bottom"></div>
      <div class="app-entrance-brand">
        <div class="app-entrance-icon" aria-hidden="true">S</div>
        <span class="app-entrance-label">LEAK SCAN</span>
      </div>
      <div class="app-entrance-line"></div>
    </div>
  </Transition>
</template>
