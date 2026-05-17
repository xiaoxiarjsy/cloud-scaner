import { z } from 'zod'

export const createTokenSchema = z.object({
  token: z.string().min(1, '请输入 GitHub Token'),
  label: z.string().optional().default('')
}).strict()

export const updateTokenSchema = z.object({
  label: z.string().optional(),
  enabled: z.boolean().optional()
}).strict()

export type CreateTokenInput = z.infer<typeof createTokenSchema>
export type UpdateTokenInput = z.infer<typeof updateTokenSchema>
