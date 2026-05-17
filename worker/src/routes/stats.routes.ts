import { Hono } from 'hono'
import type { AppVariables, Env } from '../types/env'
import { ok } from '../utils/response'

const statsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

statsRoutes.get('/api/v1/stats', async (c) => {
  const db = c.env.DB

  const [totalScans, totalFindings, severityRows, validationRows, recentScans] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM scans').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM findings').first<{ count: number }>(),
    db.prepare('SELECT severity, COUNT(*) as count FROM findings GROUP BY severity').all<{ severity: string; count: number }>(),
    db.prepare("SELECT validation_status, COUNT(*) as count FROM findings WHERE validation_status != 'unvalidated' GROUP BY validation_status").all<{ validation_status: string; count: number }>(),
    db.prepare('SELECT id, query, keyword, org, lang, status, progress_scanned, progress_skipped, progress_findings, created_at FROM scans ORDER BY created_at DESC LIMIT 5').all()
  ])

  const findingsBySeverity: Record<string, number> = {}
  for (const row of severityRows.results || []) {
    findingsBySeverity[row.severity] = row.count
  }

  const findingsByValidation: Record<string, number> = {}
  let validKeyCount = 0
  for (const row of validationRows.results || []) {
    findingsByValidation[row.validation_status] = row.count
    if (row.validation_status === 'valid') {
      validKeyCount += row.count
    }
  }

  return ok(c, {
    totalScans: totalScans?.count ?? 0,
    totalFindings: totalFindings?.count ?? 0,
    criticalFindings: findingsBySeverity.critical ?? 0,
    validKeyCount,
    findingsBySeverity,
    findingsByValidation,
    recentScans: recentScans.results || []
  })
})

export { statsRoutes }
