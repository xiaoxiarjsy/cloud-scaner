import { http } from './http'
import type { Stats } from '@/types/domain'

export const statsApi = {
  get() {
    return http.get<Stats>('/stats')
  }
}
