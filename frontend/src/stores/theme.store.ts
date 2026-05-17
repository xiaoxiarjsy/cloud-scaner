import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'leak-scan-theme'

const VALID_THEMES = new Set<ThemeMode>(['light', 'dark'])

function normalizeTheme(value: string | null): ThemeMode | null {
  return VALID_THEMES.has(value as ThemeMode) ? (value as ThemeMode) : null
}

function getStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

function getSystemTheme(): ThemeMode {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyDocumentTheme(value: ThemeMode | null): ThemeMode {
  const nextTheme = value ?? getSystemTheme()
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
  document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  return nextTheme
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(applyDocumentTheme(getStoredTheme()))

  watch(mode, (val) => {
    const nextTheme = applyDocumentTheme(val)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Storage can fail in private browsing; the document theme is still applied.
    }
  }, { immediate: true })

  return { mode }
})
