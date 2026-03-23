import { z } from 'zod'

// Auto-generated from Supabase types
// Table: test_notes

export const testnotesSchema = z.object({
  created_at: z.string().datetime(),
  description: z.string().max(2000).optional(),
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  updated_at: z.string().datetime(),
  user_id: z.string().uuid(),
})

export type TestNotes = z.infer<typeof testnotesSchema>
