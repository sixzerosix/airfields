/**
 * NEXT-SAFE-ACTION CONFIGURATION
 * 
 * Конфигурация безопасных Server Actions с:
 * - Type-safety (TypeScript end-to-end)
 * - Middleware для auth/logging
 * - Structured errors
 * - Automatic validation
 */

import { createSafeActionClient } from "next-safe-action"

// ============================================================================
// BASE CLIENT (без middleware)
// ============================================================================

/**
 * Базовый клиент для публичных actions
 */
export const publicActionClient = createSafeActionClient({
	// Обработка серверных ошибок
	handleServerError: (e) => {
		console.error("[Server Action Error]", e)

		// Можно возвращать пользовательские сообщения об ошибках
		if (e instanceof Error) {
			return e.message
		}
		return "An unknown error occurred"
	},
})

// ============================================================================
// MIDDLEWARE: LOGGING
// ============================================================================

/**
 * Middleware для логирования всех actions
 */
const loggingMiddleware = publicActionClient.use(async ({ next, clientInput }) => {
	console.log("[Action] Input:", clientInput)

	const start = Date.now()
	const result = await next({ ctx: {} })
	const duration = Date.now() - start

	console.log("[Action] Duration:", duration, "ms")
	console.log("[Action] Result:", result.success ? "✅ Success" : "❌ Failed")

	return result
})

// ============================================================================
// MIDDLEWARE: AUTHENTICATION (опционально)
// ============================================================================

/**
 * Middleware для проверки аутентификации
 * 
 * Раскомментируй когда добавишь auth!
 */
/*
const authMiddleware = loggingMiddleware.use(async ({ next }) => {
  const { getSupabaseClient } = await import("@/lib/supabase/client")
  const supabase = getSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
	throw new Error("Unauthorized")
  }
  
  return next({
	ctx: {
	  user,
	  userId: user.id,
	}
  })
})
*/

// ============================================================================
// MIDDLEWARE: RATE LIMITING (опционально)
// ============================================================================

/**
 * Простой rate limiter (in-memory)
 * 
 * В production используй Redis или Upstash!
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const rateLimitMiddleware = loggingMiddleware.use(async ({ next, clientInput }) => {
	console.log("[RateLimit] Checking rate limit for action:", clientInput)

	// Для простоты используем IP (в production используй userId)
	const key = "global" // TODO: использовать IP или userId

	const now = Date.now()
	const limit = rateLimitMap.get(key)

	if (!limit || now > limit.resetAt) {
		// Сбросить лимит (100 запросов в минуту)
		rateLimitMap.set(key, {
			count: 1,
			resetAt: now + 60000, // 1 минута
		})
	} else if (limit.count >= 100) {
		throw new Error("Rate limit exceeded. Try again later.")
	} else {
		limit.count++
	}

	return next({ ctx: {} })
})

// ============================================================================
// EXPORT: ACTION CLIENTS
// ============================================================================

/**
 * Основной клиент для всех actions
 * 
 * С логированием и rate limiting
 */
export const actionClient = rateLimitMiddleware

/**
 * Authenticated action client
 * 
 * Раскомментируй когда добавишь auth:
 * export const authActionClient = authMiddleware
 */