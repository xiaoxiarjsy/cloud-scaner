import { z } from 'zod'

export const createScanSchema = z.object({
  query: z.string().optional(),
  keyword: z.string().optional(),
  org: z.string().optional(),
  lang: z.string().optional(),
  limit: z.coerce.number().int().min(0).max(200).optional().default(30),
  minEntropy: z.coerce.number().min(0).max(8).optional().default(4.5),
  autoValidate: z.coerce.boolean().optional().default(false),
  skipHistory: z.coerce.boolean().optional().default(false),
  rules: z.array(z.string()).optional()
}).strict().refine((data) => data.query || data.keyword, {
  message: '请提供 query 或 keyword 参数'
})

export type CreateScanInput = z.infer<typeof createScanSchema>

export const listScansSchema = z.object({
  page: z.coerce.number().int().min(0).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional()
})
