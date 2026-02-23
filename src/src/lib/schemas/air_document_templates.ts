import { z } from 'zod'

// Auto-generated from Supabase types
// Table: air_document_templates

export const airdocumenttemplatesSchema = z.object({
  created_at: z.string().datetime(),
  default_format: z.string().min(1).max(100).nullable(),
  description: z.string().max(1000).optional(),
  document_type: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  is_active: z.boolean().boolean(),
  name: z.string().min(1).max(100),
  required_fields: z.string().min(1).max(100).nullable(),
  template_content: z.string().min(1).max(100).nullable(),
  updated_at: z.string().datetime(),
})

export type AirDocumentTemplates = z.infer<typeof airdocumenttemplatesSchema>
