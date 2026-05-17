import { ZodError } from 'zod'
import type { Context } from 'hono'
import { HttpError } from '../utils/http-error'
import { fail } from '../utils/response'

export function handleError(error: unknown, c: Context) {
  if (error instanceof HttpError) {
    return fail(c, error.status, error.code, error.message, error.details)
  }

  if (error instanceof ZodError) {
    return fail(
      c,
      400,
      'VALIDATION_ERROR',
      '参数校验失败',
      error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    )
  }

  console.error(error)
  return fail(c, 500, 'INTERNAL_ERROR', '服务暂时不可用')
}
