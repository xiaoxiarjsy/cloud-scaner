import { http } from './http'

export interface TokenInfo {
  id: string
  label: string
  token_preview: string
  enabled: number
  use_count: number
  last_used_at: string | null
  created_at: string
}

export interface SystemInfo {
  hasTokens: boolean
  tokenCount: number
  userCount: number
}

export const settingsApi = {
  listTokens() {
    return http.get<TokenInfo[]>('/settings/tokens')
  },
  addToken(token: string, label?: string) {
    return http.post<{ id: string; tokenPreview: string }>('/settings/tokens', { token, label })
  },
  updateToken(tokenId: string, data: { label?: string; enabled?: boolean }) {
    return http.patch<{ updated: boolean }>(`/settings/tokens/${tokenId}`, data)
  },
  deleteToken(tokenId: string) {
    return http.delete<{ deleted: boolean }>(`/settings/tokens/${tokenId}`)
  },
  systemInfo() {
    return http.get<SystemInfo>('/settings/system')
  }
}
