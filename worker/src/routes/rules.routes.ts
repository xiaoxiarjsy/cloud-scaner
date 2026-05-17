import { Hono } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { DEFAULT_RULES } from '../services/rules.data'
import { ok } from '../utils/response'

const rulesRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

rulesRoutes.get('/api/v1/rules', (c) => {
  const rules = DEFAULT_RULES.map((r) => ({
    name: r.name,
    pattern: r.pattern.source,
    description: r.description,
    severity: r.severity
  }))
  return ok(c, rules)
})

export { rulesRoutes }
