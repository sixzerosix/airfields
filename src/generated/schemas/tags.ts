import { z } from 'zod'

// Auto-generated from Supabase types
// Table: tags

export const tagsSchema = z.object({
  color: z.string().min(1).max(100).nullable(),
  created_at: z.string().datetime(),
  description: z.string().max(1000).optional(),
  icon: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(1).max(100),
  updated_at: z.string().datetime(),
  usage_count: z.number().int().nullable(),
})

export type Tags = z.infer<typeof tagsSchema>
