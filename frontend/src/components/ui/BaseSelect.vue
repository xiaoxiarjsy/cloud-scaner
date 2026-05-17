<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: Array<{ label: string; value: string }>
    class?: string
    placement?: 'bottom' | 'top'
  }>(),
  { placement: 'bottom' }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const selected = computed(() => props.options.find((o) => o.value === props.modelValue) ?? props.options[0])

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
}

function handleDocumentPointer(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentPointer)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentPointer)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div ref="root" :class="cn('relative h-10 w-full text-left text-sm', $props.class)">
    <button
      type="button"
      class="flex h-full w-full cursor-pointer items-center justify-between gap-2 border border-[var(--app-border-soft)] bg-[var(--app-surface)] px-3 text-[inherit] font-extrabold text-[var(--app-text)] outline-none transition-colors duration-200 hover:bg-[var(--app-subtle)] focus:shadow-[0_0_0_2px_hsl(var(--income)/0.18)]"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="min-w-0 truncate">{{ selected?.label || '请选择' }}</span>
      <ChevronDown class="h-4 w-4 shrink-0 text-[var(--app-muted)] transition" :class="{ 'rotate-180': open }" />
    </button>

    <div
      v-if="open"
      class="absolute left-0 right-0 z-50 border border-[var(--app-border-soft)] bg-[var(--app-surface)] p-2"
      :class="placement === 'top' ? 'bottom-[calc(100%+0.375rem)]' : 'top-[calc(100%+0.375rem)]'"
    >
      <div class="max-h-72 overflow-y-auto">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="grid min-h-10 w-full cursor-pointer grid-cols-[1.75rem_1fr] items-center gap-2 px-2 text-left text-[inherit] font-extrabold transition-colors duration-200 hover:bg-[var(--app-subtle)]"
          :class="{ 'bg-[hsl(var(--income)/0.10)] text-[hsl(var(--income))]': option.value === modelValue }"
          @click="select(option.value)"
        >
          <span class="flex h-6 w-6 items-center justify-center bg-[var(--app-subtle)] text-[var(--app-muted)]">
            <Check v-if="option.value === modelValue" class="h-4 w-4 text-[hsl(var(--income))]" />
          </span>
          <span class="truncate">{{ option.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
