import { Hono } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { createScanSchema, listScansSchema, type CreateScanInput } from '../schemas/scan.schema'
import { GitHubClient } from '../services/github.service'
import { scanContent, deduplicate, findingToRow } from '../services/scanner.service'
import { DEFAULT_RULES } from '../services/rules.data'
import { newId } from '../utils/crypto'
import { nowIso } from '../utils/date'
import { ok, fail } from '../utils/response'
import { assertFound } from '../utils/http-error'
import { consumeRateLimit, getClientIp, rateLimitKey } from '../utils/rate-limit'
import { paramsToObject } from '../utils/params'
import { TokenRotator } from '../services/token-rotation.service'
import { logAction } from '../utils/logger'

const scansRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// Helper: push log entry to KV array
async function pushLog(kv: KVNamespace, scanId: string, level: 'info' | 'found' | 'skip' | 'error', msg: string, ts: string) {
  const key = `scan:log:${scanId}`
  const raw = await kv.get(key)
  const entries: Array<{ ts: string; level: string; msg: string }> = raw ? JSON.parse(raw) : []
  entries.push({ ts, level, msg })
  // Keep last 500 entries max
  if (entries.length > 500) entries.splice(0, entries.length - 500)
  await kv.put(key, JSON.stringify(entries), { expirationTtl: 3600 })
}

// Helper: check if scan is cancelled
async function isCancelled(kv: KVNamespace, scanId: string): Promise<boolean> {
  const raw = await kv.get(`scan:cancel:${scanId}`)
  return raw === '1'
}

// List scans with pagination and status filter
scansRoutes.get('/api/v1/scans', async (c) => {
  const query = listScansSchema.parse(paramsToObject(new URL(c.req.url).searchParams))
  const db = c.env.DB

  let sql = 'SELECT id, query, keyword, org, lang, status, progress_scanned, progress_skipped, progress_findings, limit_count, min_entropy, error_message, created_at, updated_at, completed_at FROM scans'
  const conditions: string[] = []
  const binds: unknown[] = []

  if (query.status) {
    conditions.push('status = ?')
    binds.push(query.status)
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  binds.push(query.pageSize, query.page * query.pageSize)

  const rows = await db.prepare(sql).bind(...binds).all()
  return ok(c, { items: rows.results || [], page: query.page, pageSize: query.pageSize })
})

// Get scan detail
scansRoutes.get('/api/v1/scans/:scanId', async (c) => {
  const scanId = c.req.param('scanId')
  const db = c.env.DB

  const scan = await db.prepare('SELECT id, query, keyword, org, lang, status, progress_scanned, progress_skipped, progress_findings, limit_count, min_entropy, error_message, created_at, updated_at, completed_at FROM scans WHERE id = ?').bind(scanId).first()
  assertFound(scan, '扫描任务不存在')

  return ok(c, scan)
})

// Get scan log (real-time)
scansRoutes.get('/api/v1/scans/:scanId/log', async (c) => {
  const scanId = c.req.param('scanId')
  const kv = c.env.SCAN_KV
  const raw = await kv.get(`scan:log:${scanId}`)
  const entries = raw ? JSON.parse(raw) : []
  return ok(c, { entries })
})

// Get scan progress (lightweight, for polling)
scansRoutes.get('/api/v1/scans/:scanId/progress', async (c) => {
  const scanId = c.req.param('scanId')
  const kv = c.env.SCAN_KV

  const cached = await kv.get(`scan:progress:${scanId}`, 'json') as { scanned: number; skipped: number; findings: number; status: string; updatedAt: string } | null
  if (cached) {
    return ok(c, cached)
  }

  const db = c.env.DB
  const progressScan = await db.prepare('SELECT status, progress_scanned, progress_skipped, progress_findings, updated_at FROM scans WHERE id = ?').bind(scanId).first<{ status: string; progress_scanned: number; progress_skipped: number; progress_findings: number; updated_at: string }>()
  assertFound(progressScan, '扫描任务不存在')
  if (!progressScan) throw new Error('unreachable')

  return ok(c, {
    scanned: progressScan!.progress_scanned,
    skipped: progressScan!.progress_skipped,
    findings: progressScan!.progress_findings,
    status: progressScan!.status,
    updatedAt: progressScan!.updated_at
  })
})

// Cancel scan
scansRoutes.post('/api/v1/scans/:scanId/cancel', async (c) => {
  const scanId = c.req.param('scanId')
  const db = c.env.DB
  const kv = c.env.SCAN_KV

  const scan = await db.prepare("SELECT status FROM scans WHERE id = ? AND status = 'running'").bind(scanId).first<{ status: string }>()
  assertFound(scan, '没有正在运行的扫描任务')

  // Set cancel flag in KV (checked in scan loop)
  await kv.put(`scan:cancel:${scanId}`, '1', { expirationTtl: 3600 })
  await db.prepare("UPDATE scans SET status = 'cancelled', updated_at = ? WHERE id = ?").bind(nowIso(), scanId).run()
  await pushLog(kv, scanId, 'error', '扫描已被用户终止', nowIso())
  await kv.put(`scan:progress:${scanId}`, JSON.stringify({ status: 'cancelled' }), { expirationTtl: 60 })

  return ok(c, { cancelled: true })
})

// Delete scan and cascade-delete findings
scansRoutes.delete('/api/v1/scans/:scanId', async (c) => {
  const scanId = c.req.param('scanId')
  const db = c.env.DB

  const scan = await db.prepare('SELECT id FROM scans WHERE id = ?').bind(scanId).first()
  assertFound(scan, '扫描任务不存在')

  await db.prepare('DELETE FROM scans WHERE id = ?').bind(scanId).run()
  logAction(db, 'scan_delete', JSON.stringify({ scanId }), c.get('currentUserId'), getClientIp(c))

  return ok(c, { deleted: true })
})

// Background scan runner
async function runScan(scanId: string, input: CreateScanInputType, db: D1Database, kv: KVNamespace, ctx: ExecutionContext, userId: string | undefined, ip: string) {
  const rotator = await TokenRotator.load(db)
  const firstToken = rotator.next()
  if (!firstToken) {
    await db.prepare("UPDATE scans SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?").bind('未添加 GitHub Token', nowIso(), scanId).run()
    await pushLog(kv, scanId, 'error', '扫描失败: 未添加 GitHub Token', nowIso())
    return
  }

  let query = input.query || ''
  if (!query) {
    const parts: string[] = []
    if (input.keyword) parts.push(input.keyword)
    if (input.org) parts.push(`org:${input.org}`)
    if (input.lang) parts.push(`language:${input.lang}`)
    query = parts.join(' ')
  }

  const limitCount = input.limit
  const minEntropy = input.minEntropy
  const autoValidate = input.autoValidate

  const activeRules = input.rules && input.rules.length > 0
    ? DEFAULT_RULES.filter((r) => input.rules!.includes(r.name))
    : DEFAULT_RULES

  if (input.rules && input.rules.length > 0) {
    await pushLog(kv, scanId, 'info', `使用 ${activeRules.length}/${DEFAULT_RULES.length} 条规则: ${input.rules.join(', ')}`, nowIso())
  }
  if (autoValidate) await pushLog(kv, scanId, 'info', '已启用自动验证（仅保存有效密钥）', nowIso())
  await pushLog(kv, scanId, 'info', `开始扫描: ${query} (limit: ${limitCount === 0 ? '无限' : limitCount})`, nowIso())

  let currentToken = firstToken!
  try {
    const client = new GitHubClient(currentToken)
    const seenFiles = new Set<string>()
    let scanned = 0
    let skipped = 0
    let totalFindings = 0

    if (!input.skipHistory) {
      await pushLog(kv, scanId, 'info', '正在加载历史扫描缓存...', nowIso())
      const prevFiles = await db.prepare(
        'SELECT DISTINCT sf.file_key FROM scanned_files sf JOIN scans s ON sf.scan_id = s.id WHERE s.status = ?'
      ).bind('completed').all<{ file_key: string }>()
      for (const row of prevFiles.results || []) seenFiles.add(row.file_key)
      await pushLog(kv, scanId, 'info', `已加载 ${seenFiles.size} 个历史文件，将跳过`, nowIso())
    } else {
      await pushLog(kv, scanId, 'info', '已关闭历史记录去重（将扫描所有文件）', nowIso())
    }

    const searchGen = limitCount === 0 ? client.searchCodeUnlimited(query) : client.searchCode(query, limitCount)

    for await (const sr of searchGen) {
      if (await isCancelled(kv, scanId)) {
        await pushLog(kv, scanId, 'error', '扫描已终止', nowIso())
        throw new Error('CANCELLED')
      }

      const fileKey = `${sr.repo}/${sr.filePath}`
      if (seenFiles.has(fileKey)) {
        skipped++
        if (skipped % 20 === 1) await pushLog(kv, scanId, 'skip', `已跳过 ${skipped} 个文件`, nowIso())
        if (skipped % 10 === 0) await kv.put(`scan:progress:${scanId}`, JSON.stringify({ scanned, skipped, findings: totalFindings, status: 'running', updatedAt: nowIso() }), { expirationTtl: 3600 })
        continue
      }
      seenFiles.add(fileKey)
      scanned++
      await pushLog(kv, scanId, 'info', `[${scanned}] 扫描: ${fileKey}`, nowIso())

      const content = await client.getFileContent(sr.repo, sr.filePath)
      if (!content) {
        if (scanned % 10 === 0) await kv.put(`scan:progress:${scanId}`, JSON.stringify({ scanned, skipped, findings: totalFindings, status: 'running', updatedAt: nowIso() }), { expirationTtl: 3600 })
        continue
      }

      const findings = scanContent(sr.repo, sr.filePath, sr.url, content, activeRules, minEntropy)
      const unique = deduplicate(findings)

      if (unique.length > 0) {
        const savedFindings: Array<{ finding: typeof unique[0]; validation?: { status: string; json: string } }> = []
        for (const f of unique) {
          if (autoValidate) {
            const { validateFinding } = await import('../services/validator.service')
            const result = await validateFinding(f.ruleName, f.rawText)
            if (!result || !result.valid || !result.available) {
              await pushLog(kv, scanId, 'info', `跳过无效: ${f.ruleName} → ${f.repo}/${f.filePath}:${f.lineNumber}`, nowIso())
              continue
            }
            savedFindings.push({ finding: f, validation: { status: 'valid', json: JSON.stringify(result) } })
            await pushLog(kv, scanId, 'found', `[${f.severity.toUpperCase()}][已验证] ${f.ruleName} | 余额: ${result.balance} ${result.currency} → ${f.repo}/${f.filePath}:${f.lineNumber}`, nowIso())
          } else {
            savedFindings.push({ finding: f })
            await pushLog(kv, scanId, 'found', `[${f.severity.toUpperCase()}] ${f.ruleName} → ${f.repo}/${f.filePath}:${f.lineNumber}`, nowIso())
          }
        }

        if (savedFindings.length > 0) {
          const batch: D1PreparedStatement[] = []
          for (const sf of savedFindings) {
            const row = await findingToRow(sf.finding, scanId)
            const vStatus = sf.validation?.status || 'unvalidated'
            const vJson = sf.validation?.json || null
            batch.push(db.prepare(`INSERT INTO findings (id, scan_id, rule_name, severity, repo, file_path, line_number, url, matched_text, raw_text_hash, validation_status, validation_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(row.id, row.scan_id, row.rule_name, row.severity, row.repo, row.file_path, row.line_number, row.url, row.matched_text, row.raw_text_hash, vStatus, vJson, row.created_at))
            kv.put(`raw:${row.id}`, sf.finding.rawText, { expirationTtl: 3600 })
          }
          batch.push(db.prepare('INSERT OR IGNORE INTO scanned_files (scan_id, file_key, created_at) VALUES (?, ?, ?)').bind(scanId, fileKey, nowIso()))
          await db.batch(batch)
          totalFindings += savedFindings.length
        } else {
          await db.prepare('INSERT OR IGNORE INTO scanned_files (scan_id, file_key, created_at) VALUES (?, ?, ?)').bind(scanId, fileKey, nowIso()).run()
        }
      } else {
        await db.prepare('INSERT OR IGNORE INTO scanned_files (scan_id, file_key, created_at) VALUES (?, ?, ?)').bind(scanId, fileKey, nowIso()).run()
      }

      if (scanned % 10 === 0) await kv.put(`scan:progress:${scanId}`, JSON.stringify({ scanned, skipped, findings: totalFindings, status: 'running', updatedAt: nowIso() }), { expirationTtl: 3600 })
    }

    await db.prepare(`UPDATE scans SET status = 'completed', progress_scanned = ?, progress_skipped = ?, progress_findings = ?, updated_at = ?, completed_at = ? WHERE id = ?`).bind(scanned, skipped, totalFindings, nowIso(), nowIso(), scanId).run()
    await pushLog(kv, scanId, 'info', `扫描完成: ${scanned} 个文件, ${skipped} 跳过, ${totalFindings} 发现`, nowIso())
    await kv.put(`scan:progress:${scanId}`, JSON.stringify({ scanned, skipped, findings: totalFindings, status: 'completed', updatedAt: nowIso() }), { expirationTtl: 3600 })
    logAction(db, 'scan_create', JSON.stringify({ scanId, query, scanned, findings: totalFindings }), userId, ip)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isCancelled = message === 'CANCELLED'
    if (!isCancelled) {
      await db.prepare("UPDATE scans SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?").bind(message, nowIso(), scanId).run()
      await pushLog(kv, scanId, 'error', `扫描失败: ${message}`, nowIso())
    }
    await kv.put(`scan:progress:${scanId}`, JSON.stringify({ status: isCancelled ? 'cancelled' : 'failed', updatedAt: nowIso() }), { expirationTtl: 3600 })
  }
}

// Create scan (returns immediately, runs in background)
type CreateScanInputType = CreateScanInput
scansRoutes.post('/api/v1/scans', async (c) => {
  const parsed = createScanSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) throw parsed.error
  const input = parsed.data

  // Rate limit
  const ip = getClientIp(c)
  const rlKey = await rateLimitKey('scan', ip)
  await consumeRateLimit(c.env.SCAN_KV, rlKey, 5, 120, '扫描请求过于频繁，请稍后再试')

  let query = input.query || ''
  if (!query) {
    const parts: string[] = []
    if (input.keyword) parts.push(input.keyword)
    if (input.org) parts.push(`org:${input.org}`)
    if (input.lang) parts.push(`language:${input.lang}`)
    query = parts.join(' ')
  }

  const scanId = newId('scan')
  const now = nowIso()
  const db = c.env.DB
  const kv = c.env.SCAN_KV

  await db.prepare(`INSERT INTO scans (id, query, keyword, org, lang, status, limit_count, min_entropy, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'running', ?, ?, ?, ?)`).bind(scanId, query, input.keyword || '', input.org || '', input.lang || '', input.limit, input.minEntropy, now, now).run()

  await pushLog(kv, scanId, 'info', `扫描已创建: ${query}`, nowIso())
  await kv.put(`scan:progress:${scanId}`, JSON.stringify({ scanned: 0, skipped: 0, findings: 0, status: 'running', updatedAt: now }), { expirationTtl: 3600 })

  // Run scan in background via waitUntil (avoids Worker timeout)
  const execCtx = (c as any).executionCtx as ExecutionContext | undefined
  if (execCtx?.waitUntil) {
    execCtx.waitUntil(runScan(scanId, input, db, kv, execCtx, c.get('currentUserId'), ip))
  } else {
    // Fallback: fire-and-forget (less reliable but works in dev/miniflare)
    runScan(scanId, input, db, kv, { waitUntil: () => {} } as unknown as ExecutionContext, c.get('currentUserId'), ip)
  }

  return ok(c, { id: scanId, query, status: 'running' }, 202)
})

export { scansRoutes }
