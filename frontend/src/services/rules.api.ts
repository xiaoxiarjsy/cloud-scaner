import { http } from './http'
import type { Rule } from '@/types/domain'

export const rulesApi = {
  list() {
    return http.get<Rule[]>('/rules')
  }
}
