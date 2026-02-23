import { z } from 'zod'

// Auto-generated from Supabase types
// Table: shared_links

export const sharedlinksSchema = z.object({
  access_level: z.string().min(1).max(100).nullable(),
  created_at: z.string().datetime(),
  created_by: z.string().min(1).max(100).nullable(),
  description: z.string().max(1000).optional(),
  entity_id: z.string().min(1).max(100).nullable(),
  entity_type: z.string().min(1).max(100).nullable(),
  expires_at: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  is_active: z.boolean().boolean(),
  last_accessed_at: z.string().min(1).max(100).nullable(),
  never_expires: z.boolean().nullable(),
  password_hash: z.string().min(1).max(100).nullable(),
  requires_password: z.boolean().nullable(),
  token: z.string().min(1).max(100).nullable(),
  updated_at: z.string().datetime(),
  view_count: z.number().int().nullable(),
})

export type SharedLinks = z.infer<typeof sharedlinksSchema>
