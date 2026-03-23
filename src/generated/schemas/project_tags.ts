import { z } from 'zod'

// Auto-generated from Supabase types
// Table: project_tags

export const projecttagsSchema = z.object({
  created_at: z.string().datetime(),
  project_id: z.string().min(1).max(100),
  tag_id: z.string().min(1).max(100),
})

export type ProjectTags = z.infer<typeof projecttagsSchema>
