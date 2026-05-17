import { z } from 'zod'

export const listFindingsSchema = z.object({
  page: z.coerce.number().int().min(0).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  ruleName: z.string().optional(),
  repo: z.string().optional(),
  validationStatus: z.enum(['unvalidated', 'valid', 'invalid', 'error', 'unavailable']).optional(),
  scanId: z.string().optional()
})
