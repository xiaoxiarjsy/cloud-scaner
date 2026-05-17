import type { Env } from '../types/env'
import { ensureSchema } from '../db/schema'
import { hashPassword } from '../utils/password'
import { newId } from '../utils/crypto'
import { nowIso } from '../utils/date'

export async function ensureDefaultAdmin(env: Env) {
  await ensureSchema(env.DB)

  const email = env.ADMIN_EMAIL || 'admin@leak-scan.local'
  const password = env.ADMIN_PASSWORD || 'admin123'
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()

  if (existing) {
    return { adminCreated: false, email }
  }

  const id = newId('user')
  const passwordHash = await hashPassword(password)
  await env.DB.prepare('INSERT INTO users (id, email, password_hash, nickname, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, email, passwordHash, 'Admin', nowIso())
    .run()

  return { adminCreated: true, email }
}
