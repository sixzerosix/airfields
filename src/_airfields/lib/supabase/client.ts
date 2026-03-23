import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Supabase клиент для браузера
 * Singleton pattern — один экземпляр на всё приложение
 */
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseClient() {
	if (!supabaseClient) {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseAnonKey) {
			throw new Error('Missing Supabase environment variables')
		}

		supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
	}

	return supabaseClient
}

/**
 * Shorthand для быстрого доступа
 */
export const supabase = getSupabaseClient()