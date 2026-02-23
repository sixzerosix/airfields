import { z } from 'zod'

// Auto-generated from Supabase types
// Table: shared_link_statistics

export const sharedlinkstatisticsSchema = z.object({
  active_links: z.number().int().nullable(),
  avg_views: z.number().int().nullable(),
  created_by: z.string().min(1).max(100).nullable(),
  entity_type: z.string().min(1).max(100).nullable(),
  expired_active_links: z.number().int().nullable(),
  max_views: z.number().int().nullable(),
  password_protected_links: z.number().int().nullable(),
  total_links: z.number().int().nullable(),
  total_views: z.number().int().nullable(),
  valid_links: z.number().int().nullable(),
})

export type SharedLinkStatistics = z.infer<typeof sharedlinkstatisticsSchema>
