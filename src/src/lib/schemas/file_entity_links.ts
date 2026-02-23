import { z } from 'zod'

// Auto-generated from Supabase types
// Table: file_entity_links

export const fileentitylinksSchema = z.object({
  entity_id: z.string().min(1).max(100).nullable(),
  entity_type: z.string().min(1).max(100).nullable(),
  file_id: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  linked_at: z.string().min(1).max(100).nullable(),
  linked_by: z.string().min(1).max(100).nullable(),
  notes: z.string().max(5000).optional(),
})

export type FileEntityLinks = z.infer<typeof fileentitylinksSchema>
