export interface Env {
  ASSETS: Fetcher
  DB: D1Database
  SCAN_KV: KVNamespace
  GITHUB_TOKEN?: string
  JWT_SECRET?: string
  ADMIN_EMAIL?: string
  ADMIN_PASSWORD?: string
  default_limit?: string
  min_entropy?: string
}

export type AppVariables = {
  requestId: string
  currentUserId?: string
}
