import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi, type MeInfo } from '@/services/auth.api'
import { getToken, setToken } from '@/services/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<MeInfo | null>(null)
  const token = ref<string | null>(getToken())

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password)
    setToken(result.token)
    token.value = result.token
    user.value = result.user
  }

  async function loadMe() {
    if (!token.value) return
    try {
      user.value = await authApi.me()
    } catch {
      setToken(null)
      token.value = null
      user.value = null
    }
  }

  async function logout() {
    try { await authApi.logout() } catch { /* ignore */ }
    setToken(null)
    token.value = null
    user.value = null
  }

  return { user, token, isLoggedIn, login, loadMe, logout }
})
