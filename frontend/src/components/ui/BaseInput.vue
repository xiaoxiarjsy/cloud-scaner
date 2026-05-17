<script setup lang="ts">
import { cn } from '@/utils/cn'

defineProps<{
  modelValue: string | number
  type?: string
  placeholder?: string
  class?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <input
    :type="type || 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :class="
      cn(
        'h-10 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-medium text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-faint)] hover:-translate-y-px focus:border-[var(--app-border)] focus:shadow-[0_0_0_1px_var(--app-border)]',
        $props.class
      )
    "
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
