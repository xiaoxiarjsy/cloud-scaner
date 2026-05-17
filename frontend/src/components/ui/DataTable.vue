<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue'
import { ArrowUpDown } from 'lucide-vue-next'
import { cn } from '@/utils/cn'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  class?: string
  render?: (row: T) => string
}

const props = defineProps<{
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  emptyMessage?: string
  class?: string
}>()

const emit = defineEmits<{
  'update:sortKey': [key: string]
  'rowClick': [row: T]
}>()

function toggleSort(key: string) {
  emit('update:sortKey', key)
}

const cellValue = (row: T, col: Column<T>) => {
  if (col.render) return col.render(row)
  return String(row[col.key] ?? '')
}
</script>

<template>
  <div :class="cn('overflow-x-auto border border-[var(--app-border)]', $props.class)">
    <table class="w-full text-left text-sm">
      <thead>
        <tr class="border-b border-[var(--app-border)] bg-[var(--app-subtle)]">
          <th
            v-for="col in columns"
            :key="col.key"
            :class="cn(
              'px-3 py-2 font-mono text-xs font-extrabold text-[var(--app-muted)]',
              col.sortable && 'cursor-pointer hover:text-[var(--app-text)] select-none',
              col.class
            )"
            @click="col.sortable && toggleSort(col.key)"
          >
            <span class="inline-flex items-center gap-1">
              {{ col.label }}
              <ArrowUpDown v-if="col.sortable" class="h-3 w-3" />
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="px-3 py-8 text-center text-sm text-[var(--app-muted)]">
            {{ emptyMessage || '暂无数据' }}
          </td>
        </tr>
        <tr
          v-for="row in rows"
          :key="rowKey(row)"
          class="border-b border-[var(--app-border-soft)] transition-colors hover:bg-[var(--app-subtle)] cursor-pointer"
          @click="emit('rowClick', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="cn('px-3 py-2 font-medium truncate max-w-xs', col.class)"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)">
              {{ cellValue(row, col) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
