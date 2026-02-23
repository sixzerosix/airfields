import { z } from 'zod'

// Auto-generated from Supabase types
// Table: profiles

export const profilesSchema = z.object({
  avatar_url: z.string().min(1).max(100).nullable(),
  created_at: z.string().datetime(),
  email: z.string().email().min(5).max(100),
  full_name: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  last_seen_at: z.string().min(1).max(100).nullable(),
  updated_at: z.string().datetime(),
})

export type Profiles = z.infer<typeof profilesSchema>
