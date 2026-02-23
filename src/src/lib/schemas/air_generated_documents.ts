import { z } from 'zod'

// Auto-generated from Supabase types
// Table: air_generated_documents

export const airgenerateddocumentsSchema = z.object({
  celery_task_id: z.string().min(1).max(100).nullable(),
  completed_at: z.string().min(1).max(100).nullable(),
  created_at: z.string().datetime(),
  document_type: z.string().min(1).max(100).nullable(),
  error_message: z.string().min(1).max(100).nullable(),
  file_format: z.string().min(1).max(100).nullable(),
  file_name: z.string().min(1).max(100).nullable(),
  file_size_bytes: z.number().int().nullable(),
  id: z.string().uuid(),
  is_favorite: z.boolean().nullable(),
  is_vectorized: z.boolean().nullable(),
  metadata: z.string().record(z.unknown()).optional(),
  s3_path: z.string().min(1).max(100).nullable(),
  s3_url: z.string().min(1).max(100).nullable(),
  status: z.string().enum(['active', 'inactive', 'pending', 'archived']),
  template_name: z.string().min(1).max(100).nullable(),
  user_id: z.number().uuid(),
})

export type AirGeneratedDocuments = z.infer<typeof airgenerateddocumentsSchema>
