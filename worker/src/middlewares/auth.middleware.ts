import type { MiddlewareHandler } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { verifyJWT } from '../utils/jwt'
import { getSession } from '../services/session.service'
import { HttpError } from '../utils/http-error'

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'UNAUTHORIZED', '请先登录')
  }

  const token = header.slice(7)
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET || 'dev-secret-change-me')
    const session = await getSession(c.env.SCAN_KV, payload.jti)
    if (!session || session.userId !== payload.userId) {
      throw new HttpError(401, 'SESSION_EXPIRED', '会话已过期，请重新登录')
    }
    c.set('currentUserId', payload.userId)
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(401, 'UNAUTHORIZED', 'Token 无效，请重新登录')
  }

  await next()
}
