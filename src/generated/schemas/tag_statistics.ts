import { z } from 'zod'

// Auto-generated from Supabase types
// Table: tag_statistics

export const tagstatisticsSchema = z.object({
  color: z.string().min(1).max(100).nullable(),
  created_at: z.string().datetime(),
  description: z.string().max(1000).optional(),
  icon: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  project_count: z.number().int().nullable(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(1).max(100),
  task_count: z.number().int().nullable(),
  updated_at: z.string().datetime(),
  usage_count: z.number().int().nullable(),
})

export type TagStatistics = z.infer<typeof tagstatisticsSchema>
