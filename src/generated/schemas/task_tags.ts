import { z } from 'zod'

// Auto-generated from Supabase types
// Table: task_tags

export const tasktagsSchema = z.object({
  created_at: z.string().datetime(),
  tag_id: z.string().min(1).max(100),
  task_id: z.string().min(1).max(100),
})

export type TaskTags = z.infer<typeof tasktagsSchema>
