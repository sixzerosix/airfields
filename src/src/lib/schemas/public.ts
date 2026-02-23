import { z } from 'zod'

// Auto-generated from Supabase types
// Table: public

export const publicSchema = z.object({
  address: z.string().min(1).max(100).nullable(),
  ceo_name: z.string().min(1).max(100).nullable(),
  city: z.string().min(1).max(100).nullable(),
  clients_count: z.number().int().nullable(),
  competitors: z.string().min(1).max(100).nullable(),
  core_values: z.string().min(1).max(100).nullable(),
  created_at: z.string().datetime(),
  description: z.string().max(1000).optional(),
  email: z.string().email().min(5).max(100),
  employees_count: z.number().int().nullable(),
  id: z.string().uuid(),
  industry: z.string().min(1).max(100).nullable(),
  inn: z.string().min(1).max(100).nullable(),
  key_processes: z.string().min(1).max(100).nullable(),
  legal_form: z.string().min(1).max(100).nullable(),
  main_problems: z.string().min(1).max(100).nullable(),
  mission: z.string().min(1).max(100).nullable(),
  name: z.string().min(1).max(100),
  ogrn: z.string().min(1).max(100).nullable(),
  onboarding_completed: z.boolean().nullable(),
  owner_tg_id: z.number().int().nullable(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  products_services: z.string().min(1).max(100).nullable(),
  revenue_monthly: z.number().int().nullable(),
  swot_opportunities: z.string().min(1).max(100).nullable(),
  swot_strengths: z.string().min(1).max(100).nullable(),
  swot_threats: z.string().min(1).max(100).nullable(),
  swot_weaknesses: z.string().min(1).max(100).nullable(),
  updated_at: z.string().datetime(),
  used_systems: z.string().min(1).max(100).nullable(),
  website: z.string().min(1).max(100).nullable(),
})

export type Public = z.infer<typeof publicSchema>
