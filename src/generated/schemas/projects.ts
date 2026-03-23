import { z } from 'zod'

// Auto-generated from Supabase types
// Table: projects

export const projectsSchema = z.object({
  created_at: z.string().datetime(),
  description: z.string().max(2000).optional(),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  status: z.string().enum(['active', 'paused', 'completed', 'archived']),
  updated_at: z.string().datetime(),
  user_id: z.string().uuid(),
})

export type Projects = z.infer<typeof projectsSchema>
