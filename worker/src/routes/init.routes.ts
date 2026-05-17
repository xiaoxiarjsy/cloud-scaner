import { Hono } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { ensureDefaultAdmin } from '../services/bootstrap.service'
import { ok } from '../utils/response'

const initRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

initRoutes.post('/', async (c) => {
  const result = await ensureDefaultAdmin(c.env)
  return ok(c, { initialized: true, ...result })
})

export { initRoutes }
