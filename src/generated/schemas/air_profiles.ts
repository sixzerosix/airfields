import { z } from 'zod'

// Auto-generated from Supabase types
// Table: air_profiles

export const airprofilesSchema = z.object({
  communication_style: z.string().min(1).max(100).nullable(),
  created_at: z.string().datetime(),
  department_id: z.number().int().nullable(),
  full_name: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  role: z.string().enum(['admin', 'user', 'viewer']),
  search_mode: z.string().min(1).max(100).nullable(),
  tg_id: z.number().int().nullable(),
  tone: z.string().min(1).max(100).nullable(),
  updated_at: z.string().datetime(),
  username: z.string().min(1).max(100).nullable(),
})

export type AirProfiles = z.infer<typeof airprofilesSchema>
