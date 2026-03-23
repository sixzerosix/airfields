import { z } from 'zod'

// Auto-generated from Supabase types
// Table: air_role_prompts

export const airrolepromptsSchema = z.object({
  id: z.number().uuid(),
  is_active: z.boolean().boolean(),
  role_key: z.string().min(1).max(100).nullable(),
  role_name: z.string().min(1).max(100).nullable(),
  system_prompt: z.string().min(1).max(100).nullable(),
  updated_at: z.string().datetime(),
})

export type AirRolePrompts = z.infer<typeof airrolepromptsSchema>
