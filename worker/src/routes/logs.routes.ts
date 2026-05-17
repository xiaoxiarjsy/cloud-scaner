import { Hono } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { ok } from '../utils/response'
import { requireAuth } from '../middlewares/auth.middleware'

const logsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

logsRoutes.use('*', requireAuth)

logsRoutes.get('/api/v1/logs', async (c) => {
  const db = c.env.DB
  const url = new URL(c.req.url)
  const action = url.searchParams.get('action')
  const page = parseInt(url.searchParams.get('page') || '0')
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50'), 200)

  let sql = 'SELECT id, user_id, action, detail, ip, created_at FROM audit_logs'
  const binds: unknown[] = []

  if (action) {
    sql += ' WHERE action = ?'
    binds.push(action)
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  binds.push(pageSize, page * pageSize)

  const rows = await db.prepare(sql).bind(...binds).all()

  let countSql = 'SELECT COUNT(*) as total FROM audit_logs'
  if (action) countSql += ' WHERE action = ?'
  const countBinds = action ? [action] : []
  const total = await db.prepare(countSql).bind(...countBinds).first<{ total: number }>()

  return ok(c, { items: rows.results || [], total: total?.total ?? 0, page, pageSize })
})

// Get available action types for filter
logsRoutes.get('/api/v1/logs/actions', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    'SELECT DISTINCT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC'
  ).all()
  return ok(c, rows.results || [])
})

export { logsRoutes }
