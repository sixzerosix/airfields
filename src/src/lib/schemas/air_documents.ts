import { z } from 'zod'

// Auto-generated from Supabase types
// Table: air_documents

export const airdocumentsSchema = z.object({
  chunks_count: z.number().int().nullable(),
  created_at: z.string().datetime(),
  department_id: z.number().int().nullable(),
  file_id: z.string().min(1).max(100).nullable(),
  file_name: z.string().min(1).max(100).nullable(),
  file_size: z.number().int().nullable(),
  id: z.string().uuid(),
  s3_url: z.string().min(1).max(100).nullable(),
  user_id: z.number().uuid(),
})

export type AirDocuments = z.infer<typeof airdocumentsSchema>
