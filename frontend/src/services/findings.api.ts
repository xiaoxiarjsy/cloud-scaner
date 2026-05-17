import { http } from './http'
import type { PageResult } from '@/types/api'
import type { Finding, ValidationResult } from '@/types/domain'

export const findingsApi = {
  list(params: { page?: number; pageSize?: number; severity?: string; ruleName?: string; repo?: string; validationStatus?: string; scanId?: string } = {}) {
    const search = new URLSearchParams()
    if (params.page !== undefined) search.set('page', String(params.page))
    if (params.pageSize !== undefined) search.set('pageSize', String(params.pageSize))
    if (params.severity) search.set('severity', params.severity)
    if (params.ruleName) search.set('ruleName', params.ruleName)
    if (params.repo) search.set('repo', params.repo)
    if (params.validationStatus) search.set('validationStatus', params.validationStatus)
    if (params.scanId) search.set('scanId', params.scanId)
    return http.get<PageResult<Finding>>(`/findings?${search}`)
  },

  get(findingId: string) {
    return http.get<Finding>(`/findings/${findingId}`)
  },

  validate(findingId: string) {
    return http.post<ValidationResult>(`/findings/${findingId}/validate`)
  },
  verifyAll(scanId?: string) {
    return http.post<{ verified: number; failed: number; total: number }>('/findings/verify-all', scanId ? { scanId } : undefined)
  },
  delete(findingId: string) {
    return http.delete<{ deleted: boolean }>(`/findings/${findingId}`)
  },
  batchDelete(ids: string[]) {
    return http.post<{ deleted: number }>('/findings/batch-delete', { ids })
  }
}
