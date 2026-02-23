import { z } from 'zod'

// Auto-generated from Supabase types
// Table: Views

export const viewsSchema = z.object({
  bucket: z.string().min(1).max(100).nullable(),
  can_delete: z.boolean().nullable(),
  can_index: z.boolean().nullable(),
  can_read: z.boolean().nullable(),
  can_write: z.boolean().nullable(),
  chunks_count: z.number().int().nullable(),
  created_at: z.string().datetime(),
  created_by: z.string().min(1).max(100).nullable(),
  embedding_model: z.string().min(1).max(100).nullable(),
  entities: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  index_status: z.string().min(1).max(100).nullable(),
  indexing_error: z.string().min(1).max(100).nullable(),
  indexing_progress: z.number().int().nullable(),
  is_folder: z.boolean().nullable(),
  last_indexed: z.string().min(1).max(100).nullable(),
  mime_type: z.string().min(1).max(100).nullable(),
  name: z.string().min(1).max(100),
  parent_id: z.string().min(1).max(100).nullable(),
  path: z.string().min(1).max(100).nullable(),
  size: z.number().int().nullable(),
  sort_order: z.number().int().nullable(),
  starred: z.boolean().nullable(),
  storage_path: z.string().min(1).max(100).nullable(),
  storage_provider: z.string().min(1).max(100).nullable(),
  tags: z.string().array(z.string()).optional(),
  type: z.string().min(1).max(100).nullable(),
  updated_at: z.string().datetime(),
  updated_by: z.string().min(1).max(100).nullable(),
  vector_id: z.string().min(1).max(100).nullable(),
})

export type Views = z.infer<typeof viewsSchema>
