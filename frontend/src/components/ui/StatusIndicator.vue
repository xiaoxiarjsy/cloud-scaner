<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
  labelMap?: Record<string, string>
  colorMap?: Record<string, string>
}>()

const label = computed(() => props.labelMap?.[props.status] || props.status)
const color = computed(() => props.colorMap?.[props.status] || 'var(--app-muted)')
const animate = computed(() => props.status === 'running')
</script>

<template>
  <span class="inline-flex items-center gap-1.5 font-mono text-xs font-bold" :style="{ color }">
    <span
      class="inline-block h-2 w-2"
      :class="{ 'animate-pulse': animate }"
      :style="{ background: color }"
    />
    {{ label }}
  </span>
</template>
