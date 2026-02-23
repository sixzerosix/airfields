import { z } from 'zod'

// Auto-generated from Supabase types
// Table: invites

export const invitesSchema = z.object({
  accepted_at: z.string().min(1).max(100).nullable(),
  accepted_by: z.string().min(1).max(100).nullable(),
  created_at: z.string().datetime(),
  email: z.string().email().min(5).max(100),
  expires_at: z.string().min(1).max(100).nullable(),
  id: z.string().uuid(),
  invited_by: z.string().min(1).max(100).nullable(),
  role: z.string().enum(['admin', 'user', 'viewer']),
  status: z.string().enum(['active', 'inactive', 'pending', 'archived']),
  token: z.string().min(1).max(100).nullable(),
  updated_at: z.string().datetime(),
})

export type Invites = z.infer<typeof invitesSchema>
