import { z } from 'zod'

// Auto-generated from Supabase types
// Table: tasks_with_tags

export const taskswithtagsSchema = z.object({
  created_at: z.string().datetime(),
  description: z.string().max(1000).optional(),
  due_date: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  priority: z.string().enum(['low', 'medium', 'high', 'urgent']),
  project_id: z.string().min(1).max(100).nullable(),
  status: z.string().enum(['active', 'inactive', 'pending', 'archived']),
  tags: z.string().array(z.string()).optional(),
  title: z.string().min(1).max(150),
  updated_at: z.string().datetime(),
})

export type TasksWithTags = z.infer<typeof taskswithtagsSchema>
