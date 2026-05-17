<script setup lang="ts">
import { severityColor, severityLabel } from '@/utils/severity'

defineProps<{ severity: string }>()
</script>

<template>
  <span
    class="inline-flex items-center px-2 py-0.5 font-mono text-xs font-extrabold border"
    :style="{ color: severityColor(severity), borderColor: severityColor(severity) }"
  >
    {{ severityLabel(severity) }}
  </span>
</template>
