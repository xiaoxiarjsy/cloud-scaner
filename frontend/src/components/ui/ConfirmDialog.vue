<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { AlertTriangle, Info, X } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'
import { useConfirm } from '@/composables/useConfirm'

const { confirmState, confirmAccept, confirmCancel } = useConfirm()

let previousBodyOverflow = ''

const icon = computed(() => (confirmState.tone === 'default' ? Info : AlertTriangle))
const confirmVariant = computed(() => (confirmState.tone === 'danger' ? 'danger' : 'primary'))

watch(() => confirmState.open, async (open) => {
  if (open) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    document.querySelector<HTMLButtonElement>('[data-confirm-action="confirm"]')?.focus()
  } else {
    document.body.style.overflow = previousBodyOverflow
  }
})

function onKeydown(event: KeyboardEvent) {
  if (!confirmState.open) return
  if (event.key === 'Escape') confirmCancel()
}

window.addEventListener('keydown', onKeydown)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-[260ms] ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-[180ms] ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="confirmState.open" class="fixed inset-0 z-[10000] grid place-items-center px-4 py-6">
        <div class="absolute inset-0 bg-[var(--app-overlay)] backdrop-blur-[2px]" @click="confirmCancel"></div>

        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-confirm-title"
          aria-describedby="app-confirm-message"
          class="relative z-10 w-full max-w-md border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)]"
        >
          <div class="flex items-start gap-3 border-b border-[var(--app-border)] p-4">
            <div class="grid h-10 w-10 shrink-0 place-items-center border border-[var(--app-border)] bg-[var(--app-subtle)]">
              <component :is="icon" class="h-5 w-5" :style="{ color: confirmState.tone === 'danger' ? 'var(--expense)' : 'var(--app-text)' }" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 id="app-confirm-title" class="font-mono text-sm font-extrabold">{{ confirmState.title }}</h2>
              <p id="app-confirm-message" class="mt-1 text-sm leading-6 text-[var(--app-muted)]">{{ confirmState.message }}</p>
            </div>
            <button
              type="button"
              class="grid h-8 w-8 shrink-0 place-items-center text-[var(--app-muted)] transition-colors hover:text-[var(--app-text)]"
              aria-label="关闭"
              @click="confirmCancel"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="flex justify-end gap-2 p-4">
            <BaseButton variant="ghost" size="sm" @click="confirmCancel">{{ confirmState.cancelText }}</BaseButton>
            <BaseButton :variant="confirmVariant" size="sm" data-confirm-action="confirm" @click="confirmAccept">
              {{ confirmState.confirmText }}
            </BaseButton>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
