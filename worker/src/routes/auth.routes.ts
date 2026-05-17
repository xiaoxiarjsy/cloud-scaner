import { Hono } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { loginSchema } from '../schemas/auth.schema'
import { signJWT } from '../utils/jwt'
import { verifyPassword } from '../utils/password'
import { createSession, deleteSession } from '../services/session.service'
import { newId } from '../utils/crypto'
import { ok, fail } from '../utils/response'
import { requireAuth } from '../middlewares/auth.middleware'
import { consumeRateLimit, getClientIp, rateLimitKey } from '../utils/rate-limit'
import { logAction } from '../utils/logger'
import { ensureDefaultAdmin } from '../services/bootstrap.service'

const authRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

authRoutes.post('/api/v1/auth/login', async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) throw parsed.error

  const { email, password } = parsed.data
  await ensureDefaultAdmin(c.env)

  // Rate limit: 5 failed attempts per 300s per IP
  const ip = getClientIp(c)
  const rlKey = await rateLimitKey('login', ip)
  await consumeRateLimit(c.env.SCAN_KV, rlKey, 5, 300, '登录尝试过于频繁，请5分钟后再试')

  const db = c.env.DB
  const user = await db.prepare('SELECT id, email, password_hash, nickname FROM users WHERE email = ?')
    .bind(email).first<{ id: string; email: string; password_hash: string; nickname: string }>()

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return fail(c, 401, 'INVALID_CREDENTIALS', '邮箱或密码错误')
  }

  const jti = newId('sess')
  const jwtSecret = c.env.JWT_SECRET || 'dev-secret-change-me'
  const token = await signJWT({ userId: user.id, jti }, jwtSecret)
  await createSession(c.env.SCAN_KV, jti, user.id)
  logAction(c.env.DB, 'login', JSON.stringify({ email }), user.id, ip)

  return ok(c, {
    token,
    user: { id: user.id, email: user.email, nickname: user.nickname }
  })
})

authRoutes.post('/api/v1/auth/logout', requireAuth, async (c) => {
  const header = c.req.header('Authorization')!
  const token = header.slice(7)

  try {
    const jwtSecret = c.env.JWT_SECRET || 'dev-secret-change-me'
    const { verifyJWT } = await import('../utils/jwt')
    const payload = await verifyJWT(token, jwtSecret)
    await deleteSession(c.env.SCAN_KV, payload.jti)
    logAction(c.env.DB, 'logout', '', payload.userId, getClientIp(c))
  } catch { /* ignore */ }

  return ok(c, { loggedOut: true })
})

authRoutes.get('/api/v1/auth/me', requireAuth, async (c) => {
  const userId = c.get('currentUserId')!
  const db = c.env.DB
  const user = await db.prepare('SELECT id, email, nickname FROM users WHERE id = ?')
    .bind(userId).first<{ id: string; email: string; nickname: string }>()
  if (!user) return fail(c, 404, 'NOT_FOUND', '用户不存在')
  return ok(c, user)
})

export { authRoutes }
