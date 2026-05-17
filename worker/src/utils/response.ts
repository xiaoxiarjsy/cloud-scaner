import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json(
    {
      code: 'OK',
      message: 'ok',
      data,
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString()
    },
    status
  )
}

export function fail(c: Context, status: ContentfulStatusCode, code: string, message: string, details?: unknown) {
  return c.json(
    {
      code,
      message,
      details,
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString()
    },
    status
  )
}
