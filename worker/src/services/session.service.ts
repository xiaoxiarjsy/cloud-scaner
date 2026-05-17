export interface SessionEntry {
  userId: string
  expiresAt: number
}

export async function createSession(kv: KVNamespace, jti: string, userId: string, ttlSeconds = 604800) {
  const expiresAt = Date.now() + ttlSeconds * 1000
  await kv.put(`session:${jti}`, JSON.stringify({ userId, expiresAt }), { expirationTtl: ttlSeconds })
  // Track user sessions (max 5)
  const key = `user_sessions:${userId}`
  const raw = await kv.get(key)
  const sessions: Array<{ jti: string; createdAt: number; expiresAt: number }> = raw ? JSON.parse(raw) : []
  sessions.push({ jti, createdAt: Date.now(), expiresAt })
  // Keep only last 5
  while (sessions.length > 5) sessions.shift()
  await kv.put(key, JSON.stringify(sessions))
}

export async function getSession(kv: KVNamespace, jti: string): Promise<SessionEntry | null> {
  const raw = await kv.get(`session:${jti}`)
  if (!raw) return null
  const session = JSON.parse(raw) as SessionEntry
  if (session.expiresAt < Date.now()) {
    await kv.delete(`session:${jti}`)
    return null
  }
  return session
}

export async function deleteSession(kv: KVNamespace, jti: string) {
  await kv.delete(`session:${jti}`)
}
