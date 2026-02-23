import { z } from 'zod'

// Auto-generated from Supabase types
// Table: invite_statistics

export const invitestatisticsSchema = z.object({
  accepted_invites: z.number().int().nullable(),
  avg_acceptance_time_seconds: z.number().int().nullable(),
  expired_invites: z.number().int().nullable(),
  first_invite_date: z.string().min(1).max(100).nullable(),
  invited_by: z.string().min(1).max(100).nullable(),
  last_invite_date: z.string().min(1).max(100).nullable(),
  pending_invites: z.number().int().nullable(),
  revoked_invites: z.number().int().nullable(),
  total_invites: z.number().int().nullable(),
})

export type InviteStatistics = z.infer<typeof invitestatisticsSchema>
