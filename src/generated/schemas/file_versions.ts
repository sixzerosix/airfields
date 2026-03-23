import { z } from 'zod'

// Auto-generated from Supabase types
// Table: file_versions

export const fileversionsSchema = z.object({
  created_at: z.string().datetime(),
  created_by: z.string().min(1).max(100).nullable(),
  file_id: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  mime_type: z.string().min(1).max(100).nullable(),
  size: z.number().int().nullable(),
  storage_path: z.string().min(1).max(100).nullable(),
  version_number: z.number().int().nullable(),
})

export type FileVersions = z.infer<typeof fileversionsSchema>
