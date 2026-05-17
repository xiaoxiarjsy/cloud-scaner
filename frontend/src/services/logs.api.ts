import { http } from './http'
import type { PageResult } from '@/types/api'

export interface LogEntry {
  id: string
  user_id: string | null
  action: string
  detail: string | null
  ip: string | null
  created_at: string
}

export interface ActionCount {
  action: string
  count: number
}

export const logsApi = {
  list(params: { page?: number; pageSize?: number; action?: string } = {}) {
    const search = new URLSearchParams()
    if (params.page !== undefined) search.set('page', String(params.page))
    if (params.pageSize !== undefined) search.set('pageSize', String(params.pageSize))
    if (params.action) search.set('action', params.action)
    return http.get<PageResult<LogEntry>>(`/logs?${search}`)
  },
  actions() {
    return http.get<ActionCount[]>('/logs/actions')
  }
}
