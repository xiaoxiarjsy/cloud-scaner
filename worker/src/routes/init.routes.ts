import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { ensureDefaultAdmin } from '../services/bootstrap.service'
import { ok } from '../utils/response'

const initRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

type InitContext = Context<{ Bindings: Env; Variables: AppVariables }>

async function initialize(c: InitContext) {
  const result = await ensureDefaultAdmin(c.env)
  return ok(c, { initialized: true, ...result })
}

initRoutes.get('/', initialize)
initRoutes.post('/', initialize)
initRoutes.get('', initialize)
initRoutes.post('', initialize)

export { initRoutes }
