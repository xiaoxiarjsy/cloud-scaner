import type { MiddlewareHandler } from 'hono'
import { newId } from '../utils/crypto'

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header('X-Request-Id') || newId('request')
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)
  await next()
}
