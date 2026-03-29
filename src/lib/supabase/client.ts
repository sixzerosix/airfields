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




// import { createBrowserClient } from '@supabase/ssr'
// import type { Database } from './types'

// let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// export function getSupabaseClient() {
//   if (!supabaseClient) {
//     supabaseClient = createBrowserClient<Database>(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//       {
//         auth: {
//           // Основные фиксы для долгого idle
//           autoRefreshToken: true,
//           persistSession: true,
//           detectSessionInUrl: false,

//           // Отключаем проблемный LockManager (самый частый виновник)
//           lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
//             return await fn() // no-op lock
//           },
//         },
//         realtime: {
//           params: {
//             eventsPerSecond: 10, // снижает нагрузку
//           },
//         },
//       }
//     )
//   }
//   return supabaseClient
// }





// import { createBrowserClient } from '@supabase/ssr'
// import type { Database } from './types'

// /**
//  * Supabase клиент для браузера
//  * Singleton + noOpLock — решает LockManager timeout
//  */
// let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// export function getSupabaseClient() {
// 	if (!supabaseClient) {
// 		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// 		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 		if (!supabaseUrl || !supabaseAnonKey) {
// 			throw new Error('Missing Supabase environment variables')
// 		}

// 		supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
// 			auth: {
// 				// ← Это главное лекарство от твоей ошибки
// 				lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
// 					return await fn() // no-op lock
// 				},
// 				autoRefreshToken: true,
// 				persistSession: true,
// 				detectSessionInUrl: false,
// 			},
// 		})
// 	}

// 	return supabaseClient
// }

// /**
//  * Shorthand
//  */
// export const supabase = getSupabaseClient()