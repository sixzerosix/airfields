// lib/supabase/realtime.ts  (можно оставить как тонкую обёртку)

import { initializeRealtime, cleanupRealtime, unsubscribe } from './realtime-manager'

export { initializeRealtime, cleanupRealtime, unsubscribe }

// Для совместимости со старым кодом
export function subscribeToEntity() {
	// Ничего не делаем — инициализация уже произошла в layout
	return () => { }
}