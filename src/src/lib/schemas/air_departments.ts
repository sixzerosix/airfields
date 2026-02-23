import { z } from 'zod'

// Auto-generated from Supabase types
// Table: air_departments

export const airdepartmentsSchema = z.object({
  created_at: z.string().datetime(),
  description: z.string().max(1000).optional(),
  id: z.number().uuid(),
  name: z.string().min(1).max(100),
})

export type AirDepartments = z.infer<typeof airdepartmentsSchema>
