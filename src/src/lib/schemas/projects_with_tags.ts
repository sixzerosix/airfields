import { z } from 'zod'

// Auto-generated from Supabase types
// Table: projects_with_tags

export const projectswithtagsSchema = z.object({
  created_at: z.string().datetime(),
  description: z.string().max(1000).optional(),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  status: z.string().enum(['active', 'inactive', 'pending', 'archived']),
  tags: z.string().array(z.string()).optional(),
  updated_at: z.string().datetime(),
})

export type ProjectsWithTags = z.infer<typeof projectswithtagsSchema>
