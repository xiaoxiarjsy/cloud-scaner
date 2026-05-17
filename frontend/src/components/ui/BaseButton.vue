<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    disabled?: boolean
    class?: string
  }>(),
  { type: 'button', variant: 'primary', size: 'md', disabled: false }
)

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50',
    'border border-[var(--app-border)] font-bold btn-press',
    props.size === 'sm' ? 'h-8 px-3' : 'h-10 px-4',
    props.variant === 'primary' && 'bg-[var(--app-inverse)] text-[var(--app-inverse-text)] hover:bg-[var(--app-hover)]',
    props.variant === 'secondary' && 'bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-subtle-strong)]',
    props.variant === 'ghost' && 'border-transparent bg-transparent text-[var(--app-text)] hover:border-[var(--app-border)] hover:bg-[var(--app-subtle)]',
    props.variant === 'danger' && 'bg-[var(--app-text)] text-[var(--app-inverse-text)] hover:bg-[var(--app-hover)]',
    'hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-border)]',
    props.class
  )
)
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
