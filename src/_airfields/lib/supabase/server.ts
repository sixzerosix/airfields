/**
 * SUPABASE SERVER CLIENT
 * 
 * Используется ТОЛЬКО на сервере (Server Actions, Server Components)
 * 
 * ВАЖНО: НЕ импортируй это на клиенте!
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Создать Supabase клиент для Server Actions и Server Components
 * 
 * Next.js 15+: cookies() теперь async!
 * 
 * @example
 * // В Server Action:
 * const supabase = await createServerSupabaseClient()
 * const { data } = await supabase.from('tasks').select('*')
 * 
 * @example
 * // В Server Component:
 * const supabase = await createServerSupabaseClient()
 * const task = await supabase.from('tasks').select('*').eq('id', id).single()
 */
export async function createServerSupabaseClient() {
	const cookieStore = await cookies()

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						)
					} catch {
						// Может быть вызван из Server Component где set не доступен
					}
				},
			},
		}
	)
}

/**
 * Алиас для короткого импорта
 */
export const createClient = createServerSupabaseClient