<script setup lang="ts">
defineProps<{
  label: string
  value: string
  tone?: 'default' | 'critical' | 'valid' | 'warning'
}>()
</script>

<template>
  <section class="min-h-24 border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-[var(--app-text)] card-lift">
    <p class="text-sm font-bold text-[var(--app-muted)]">{{ label }}</p>
    <p
      class="mt-4 truncate font-mono text-2xl font-extrabold leading-none"
      :style="{
        color: tone === 'critical' ? 'var(--critical)'
          : tone === 'valid' ? 'var(--valid)'
          : tone === 'warning' ? 'var(--warning)'
          : 'var(--app-text)'
      }"
    >
      {{ value }}
    </p>
  </section>
</template>
