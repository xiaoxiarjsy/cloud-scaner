import { Hono } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { listFindingsSchema } from '../schemas/finding.schema'
import { validateFinding } from '../services/validator.service'
import { nowIso } from '../utils/date'
import { ok, fail } from '../utils/response'
import { assertFound } from '../utils/http-error'
import { consumeRateLimit, getClientIp, rateLimitKey } from '../utils/rate-limit'
import { paramsToObject } from '../utils/params'
import { logAction } from '../utils/logger'

const findingsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// List findings with filters
findingsRoutes.get('/api/v1/findings', async (c) => {
  const query = listFindingsSchema.parse(paramsToObject(new URL(c.req.url).searchParams))
  const db = c.env.DB

  const conditions: string[] = []
  const binds: unknown[] = []

  if (query.severity) {
    conditions.push('f.severity = ?')
    binds.push(query.severity)
  }
  if (query.ruleName) {
    conditions.push('f.rule_name = ?')
    binds.push(query.ruleName)
  }
  if (query.repo) {
    conditions.push('f.repo LIKE ?')
    binds.push(`%${query.repo}%`)
  }
  if (query.validationStatus) {
    conditions.push('f.validation_status = ?')
    binds.push(query.validationStatus)
  }
  if (query.scanId) {
    conditions.push('f.scan_id = ?')
    binds.push(query.scanId)
  }

  let sql = 'SELECT f.id, f.scan_id, f.rule_name, f.severity, f.repo, f.file_path, f.line_number, f.url, f.matched_text, f.validation_status, f.validation_json, f.validated_at, f.created_at FROM findings f'
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?'
  binds.push(query.pageSize, query.page * query.pageSize)

  const rows = await db.prepare(sql).bind(...binds).all()

  // Count total (without pagination)
  let countSql = 'SELECT COUNT(*) as total FROM findings f'
  if (conditions.length > 0) countSql += ' WHERE ' + conditions.join(' AND ')
  const countResult = await db.prepare(countSql).bind(...binds.slice(0, -2)).first<{ total: number }>()

  return ok(c, { items: rows.results || [], total: countResult?.total ?? 0, page: query.page, pageSize: query.pageSize })
})

// Get single finding
findingsRoutes.get('/api/v1/findings/:findingId', async (c) => {
  const findingId = c.req.param('findingId')
  const db = c.env.DB

  const finding = await db.prepare(
    'SELECT id, scan_id, rule_name, severity, repo, file_path, line_number, url, matched_text, validation_status, validation_json, validated_at, created_at FROM findings WHERE id = ?'
  ).bind(findingId).first()
  assertFound(finding, '发现记录不存在')

  return ok(c, finding)
})

// Trigger on-demand key validation
findingsRoutes.post('/api/v1/findings/:findingId/validate', async (c) => {
  const findingId = c.req.param('findingId')
  const db = c.env.DB
  const kv = c.env.SCAN_KV

  // Rate limit validation: 10 per 60 seconds per IP
  const ip = getClientIp(c)
  const rlKey = await rateLimitKey('validate', ip)
  await consumeRateLimit(kv, rlKey, 10, 60, '验证请求过于频繁，请稍后再试')

  const finding = await db.prepare(
    'SELECT id, rule_name, severity, repo, file_path, url FROM findings WHERE id = ?'
  ).bind(findingId).first<{ id: string; rule_name: string; severity: string; repo: string; file_path: string; url: string }>()
  assertFound(finding, '发现记录不存在')
  if (!finding) throw new Error('unreachable')

  // Read raw text from KV cache (set during scan, TTL 1 hour)
  const rawText = await kv.get(`raw:${findingId}`)
  if (!rawText) {
    return fail(c, 400, 'RAW_TEXT_EXPIRED', '密钥原文已过期（超过1小时），请重新扫描或手动输入验证')
  }

  const result = await validateFinding(finding.rule_name, rawText)

  if (!result) {
    await db.prepare(
      "UPDATE findings SET validation_status = 'error', validation_json = ?, validated_at = ? WHERE id = ?"
    ).bind(JSON.stringify({ message: '验证服务暂时不可用' }), nowIso(), findingId).run()
    return fail(c, 502, 'VALIDATION_FAILED', '验证服务暂时不可用，请稍后重试')
  }

  let validationStatus: string
  if (!result.valid) {
    validationStatus = 'invalid'
  } else if (!result.available) {
    validationStatus = 'unavailable'
  } else {
    validationStatus = 'valid'
  }

  await db.prepare(
    'UPDATE findings SET validation_status = ?, validation_json = ?, validated_at = ? WHERE id = ?'
  ).bind(validationStatus, JSON.stringify(result), nowIso(), findingId).run()

  logAction(db, 'finding_validate', JSON.stringify({ findingId, status: validationStatus }), c.get('currentUserId'), ip)

  return ok(c, { validationStatus, ...result })
})

// Verify all unvalidated findings (optionally scoped to scan)
findingsRoutes.post('/api/v1/findings/verify-all', async (c) => {
  const db = c.env.DB
  const kv = c.env.SCAN_KV
  const ip = getClientIp(c)
  const body = await c.req.json().catch(() => ({})) as { scanId?: string }

  const rlKey = await rateLimitKey('validate', ip)
  await consumeRateLimit(kv, rlKey, 20, 120, '验证请求过于频繁')

  let sql = "SELECT id, rule_name, severity FROM findings WHERE validation_status = 'unvalidated'"
  const binds: string[] = []
  if (body.scanId) { sql += ' AND scan_id = ?'; binds.push(body.scanId) }
  sql += ' ORDER BY created_at ASC LIMIT 50'

  const rows = await db.prepare(sql).bind(...binds).all<{ id: string; rule_name: string; severity: string }>()
  const items = rows.results || []
  if (items.length === 0) return ok(c, { verified: 0, failed: 0, total: 0 })

  let verified = 0
  let failed = 0
  for (const item of items) {
    const rawText = await kv.get(`raw:${item.id}`)
    if (!rawText) {
      await db.prepare("UPDATE findings SET validation_status = 'error', validation_json = ?, validated_at = ? WHERE id = ?")
        .bind(JSON.stringify({ message: '密钥原文已过期，请重新扫描后再验证' }), nowIso(), item.id)
        .run()
      failed++
      continue
    }

    const result = await validateFinding(item.rule_name, rawText)
    if (!result) {
      await db.prepare("UPDATE findings SET validation_status = 'error', validation_json = ?, validated_at = ? WHERE id = ?").bind(JSON.stringify({ message: '验证服务不可用' }), nowIso(), item.id).run()
      failed++
      continue
    }

    let status = 'invalid'
    if (result.valid && result.available) status = 'valid'
    else if (result.valid) status = 'unavailable'

    await db.prepare('UPDATE findings SET validation_status = ?, validation_json = ?, validated_at = ? WHERE id = ?').bind(status, JSON.stringify(result), nowIso(), item.id).run()
    verified++
  }

  logAction(db, 'finding_batch_validate', JSON.stringify({ verified, failed, total: items.length }), c.get('currentUserId'), ip)
  return ok(c, { verified, failed, total: items.length })
})

// Delete single finding
findingsRoutes.delete('/api/v1/findings/:findingId', async (c) => {
  const findingId = c.req.param('findingId')
  const db = c.env.DB
  const existing = await db.prepare('SELECT id FROM findings WHERE id = ?').bind(findingId).first()
  assertFound(existing, '发现记录不存在')
  await db.prepare('DELETE FROM findings WHERE id = ?').bind(findingId).run()
  logAction(db, 'finding_delete', findingId, c.get('currentUserId'), getClientIp(c))
  return ok(c, { deleted: true })
})

// Batch delete findings
findingsRoutes.post('/api/v1/findings/batch-delete', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { ids: string[] }
  if (!body.ids?.length) return fail(c, 400, 'INVALID', '请提供要删除的 ID 列表')
  const db = c.env.DB
  const batch: D1PreparedStatement[] = body.ids.map((id) => db.prepare('DELETE FROM findings WHERE id = ?').bind(id))
  await db.batch(batch)
  logAction(db, 'finding_batch_delete', JSON.stringify({ count: body.ids.length }), c.get('currentUserId'), getClientIp(c))
  return ok(c, { deleted: body.ids.length })
})

export { findingsRoutes }
