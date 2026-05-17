import type { Context } from 'hono'
import { HttpError } from './http-error'

const encoder = new TextEncoder()

interface RateLimitEntry {
  count: number
  resetAt: number
}

function isRateLimitEntry(value: unknown): value is RateLimitEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<RateLimitEntry>
  return typeof entry.count === 'number' && typeof entry.resetAt === 'number'
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function getClientIp(c: Context) {
  const forwardedFor = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || c.req.header('X-Forwarded-For')
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
}

export async function rateLimitKey(scope: string, value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${scope}:${value}`))
  return `rate:${scope}:${bytesToHex(new Uint8Array(digest))}`
}

export async function consumeRateLimit(kv: KVNamespace, key: string, limit: number, windowSeconds: number, message: string) {
  const now = Date.now()
  const stored = (await kv.get(key, 'json')) as unknown
  const current = isRateLimitEntry(stored) && stored.resetAt > now ? stored : { count: 0, resetAt: now + windowSeconds * 1000 }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    throw new HttpError(429, 'RATE_LIMITED', message, { retryAfter })
  }

  await kv.put(key, JSON.stringify({ count: current.count + 1, resetAt: current.resetAt }), {
    expirationTtl: Math.max(60, Math.ceil((current.resetAt - now) / 1000) + 30)
  })
}
