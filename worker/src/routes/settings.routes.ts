import { Hono } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { createTokenSchema, updateTokenSchema } from '../schemas/settings.schema'
import { newId } from '../utils/crypto'
import { nowIso } from '../utils/date'
import { ok, fail } from '../utils/response'
import { assertFound } from '../utils/http-error'
import { requireAuth } from '../middlewares/auth.middleware'
import { logAction } from '../utils/logger'
import { getClientIp } from '../utils/rate-limit'

const settingsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

settingsRoutes.use('*', requireAuth)

// List tokens (masked values)
settingsRoutes.get('/api/v1/settings/tokens', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    'SELECT id, label, enabled, use_count, last_used_at, created_at, SUBSTR(token_value, 1, 8) || "***" as token_preview FROM github_tokens ORDER BY created_at DESC'
  ).all()
  return ok(c, rows.results || [])
})

// Add token
settingsRoutes.post('/api/v1/settings/tokens', async (c) => {
  const parsed = createTokenSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) throw parsed.error

  const { token, label } = parsed.data
  const db = c.env.DB

  // Check duplicate (first 16 chars match)
  const first16 = token.slice(0, 16)
  const existing = await db.prepare(
    "SELECT id FROM github_tokens WHERE SUBSTR(token_value, 1, 16) = ?"
  ).bind(first16).first()
  if (existing) {
    return fail(c, 409, 'DUPLICATE', '该 Token 已存在')
  }

  const id = newId('tok')
  await db.prepare(
    'INSERT INTO github_tokens (id, label, token_value, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, label || '', token, nowIso()).run()
  logAction(db, 'token_add', JSON.stringify({ label: label || '', preview: token.slice(0, 8) + '***' }), c.get('currentUserId'), getClientIp(c))

  return ok(c, { id, label: label || '', tokenPreview: token.slice(0, 8) + '***' }, 201)
})

// Update token (label/enabled)
settingsRoutes.patch('/api/v1/settings/tokens/:tokenId', async (c) => {
  const tokenId = c.req.param('tokenId')
  const parsed = updateTokenSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) throw parsed.error

  const db = c.env.DB
  const existing = await db.prepare('SELECT id FROM github_tokens WHERE id = ?').bind(tokenId).first()
  assertFound(existing, 'Token 不存在')

  const updates: string[] = []
  const binds: unknown[] = []
  if (parsed.data.label !== undefined) { updates.push('label = ?'); binds.push(parsed.data.label) }
  if (parsed.data.enabled !== undefined) { updates.push('enabled = ?'); binds.push(parsed.data.enabled ? 1 : 0) }

  if (updates.length > 0) {
    binds.push(tokenId)
    await db.prepare(`UPDATE github_tokens SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run()
  }

  return ok(c, { updated: true })
})

// Delete token
settingsRoutes.delete('/api/v1/settings/tokens/:tokenId', async (c) => {
  const tokenId = c.req.param('tokenId')
  const db = c.env.DB

  const existing = await db.prepare('SELECT id FROM github_tokens WHERE id = ?').bind(tokenId).first()
  assertFound(existing, 'Token 不存在')

  await db.prepare('DELETE FROM github_tokens WHERE id = ?').bind(tokenId).run()
  logAction(db, 'token_delete', tokenId, c.get('currentUserId'), getClientIp(c))
  return ok(c, { deleted: true })
})

// System info (has tokens, etc)
settingsRoutes.get('/api/v1/settings/system', async (c) => {
  const db = c.env.DB
  const [tokenCount, userCount] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM github_tokens WHERE enabled = 1').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
  ])

  return ok(c, {
    hasTokens: (tokenCount?.count ?? 0) > 0,
    tokenCount: tokenCount?.count ?? 0,
    userCount: userCount?.count ?? 0
  })
})

export { settingsRoutes }
