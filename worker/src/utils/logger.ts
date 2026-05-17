import type { D1Database } from '@cloudflare/workers-types'
import { newId } from './crypto'
import { nowIso } from './date'

export async function logAction(db: D1Database, action: string, detail?: string, userId?: string, ip?: string) {
  const id = newId('log')
  await db.prepare(
    'INSERT INTO audit_logs (id, user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId || null, action, detail || null, ip || null, nowIso()).run()
}
