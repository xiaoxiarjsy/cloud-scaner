import { reactive, readonly } from 'vue'

export type ConfirmTone = 'default' | 'danger' | 'warning'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: ConfirmTone
}

const state = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  tone: 'default' as ConfirmTone
})

let resolver: ((confirmed: boolean) => void) | null = null

function settle(confirmed: boolean) {
  if (!resolver) return
  const resolve = resolver
  resolver = null
  state.open = false
  resolve(confirmed)
}

export function useConfirm() {
  function confirm(options: ConfirmOptions) {
    if (resolver) settle(false)

    state.title = options.title
    state.message = options.message
    state.confirmText = options.confirmText ?? '确认'
    state.cancelText = options.cancelText ?? '取消'
    state.tone = options.tone ?? 'default'
    state.open = true

    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  return {
    confirm,
    confirmState: readonly(state),
    confirmAccept: () => settle(true),
    confirmCancel: () => settle(false)
  }
}
