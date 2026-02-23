import { z } from 'zod'

// Auto-generated from Supabase types
// Table: air_favorites

export const airfavoritesSchema = z.object({
  chat_id: z.number().int().nullable(),
  created_at: z.string().datetime(),
  id: z.string().uuid(),
  message_id: z.number().int().nullable(),
  message_text: z.string().min(1).max(100).nullable(),
  message_type: z.string().min(1).max(100).nullable(),
  user_id: z.number().uuid(),
})

export type AirFavorites = z.infer<typeof airfavoritesSchema>
