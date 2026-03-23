import { z } from 'zod'

// Auto-generated from Supabase types
// Table: tasks

export const tasksSchema = z.object({
  created_at: z.string().datetime(),
  description: z.string().max(1000).optional(),
  due_date: z.string().datetime().optional(),
  id: z.string().uuid(),
  priority: z.string().enum(['low', 'medium', 'high', 'urgent']),
  project_id: z.string().min(1).max(100).nullable(),
  status: z.string().enum(['todo', 'in_progress', 'done']),
  title: z.string().min(1).max(150),
  updated_at: z.string().datetime(),
  user_id: z.string().uuid(),
})

export type Tasks = z.infer<typeof tasksSchema>
