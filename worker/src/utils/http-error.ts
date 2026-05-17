import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class HttpError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
  }
}

export function assertFound<T>(value: T | null | undefined, message = '资源不存在'): T {
  if (value == null) {
    throw new HttpError(404, 'NOT_FOUND', message)
  }
  return value
}
