import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱'),
  password: z.string().min(1, '请输入密码')
}).strict()

export type LoginInput = z.infer<typeof loginSchema>
