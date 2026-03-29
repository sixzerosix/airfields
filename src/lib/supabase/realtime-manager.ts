// lib/supabase/realtime-manager.ts
import { getSupabaseClient } from './client'
import { useStore } from '../store'
import { SUPPORTED_ENTITIES, type EntityType } from '../schemas'

const activeChannels = new Map<EntityType, any>()

/**
 * Подписаться на все поддерживаемые сущности (вызывать один раз при старте)
 */
export function initializeRealtime() {
	const supabase = getSupabaseClient()

	SUPPORTED_ENTITIES.forEach((entity) => {
		if (activeChannels.has(entity)) return

		console.log(`[RealtimeManager] Initializing subscription for "${entity}"`)

		const channel = supabase
			.channel(`global:${entity}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: entity,
				},
				(payload) => handleRealtimePayload(entity, payload)
			)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					console.log(`[RealtimeManager] Subscribed to "${entity}"`)
				}
				if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
					console.warn(`[RealtimeManager] Channel error for ${entity}. Reconnecting...`)
					setTimeout(() => {
						unsubscribe(entity)
						// Повторная подписка
						setTimeout(() => initializeRealtime(), 1500)
					}, 1000)
				}
			})

		activeChannels.set(entity, channel)
	})
}

/**
 * Обработка всех событий от Supabase
 */
function handleRealtimePayload(entity: EntityType, payload: any) {
	const { eventType, new: newRecord, old: oldRecord } = payload

	const store = useStore.getState()

	try {
		switch (eventType) {
			case 'INSERT':
				if (newRecord?.id) {
					store.upsertEntity(entity, newRecord.id, newRecord)
				}
				break

			case 'UPDATE':
				if (newRecord?.id) {
					store.upsertEntity(entity, newRecord.id, newRecord)
				}
				break

			case 'DELETE':
				if (oldRecord?.id) {
					store.deleteEntity(entity, oldRecord.id)
				}
				break
		}
	} catch (err) {
		console.error(`[RealtimeManager] Error handling ${eventType} for ${entity}:`, err)
	}
}

/**
 * Отписаться от конкретной сущности (редко используется)
 */
export function unsubscribe(entity: EntityType) {
	const channel = activeChannels.get(entity)
	if (channel) {
		const supabase = getSupabaseClient()
		supabase.removeChannel(channel)
		activeChannels.delete(entity)
		console.log(`[RealtimeManager] Unsubscribed from "${entity}"`)
	}
}

/**
 * Полностью очистить все каналы (при logout или unmount приложения)
 */
export function cleanupRealtime() {
	const supabase = getSupabaseClient()
	activeChannels.forEach((channel) => {
		supabase.removeChannel(channel)
	})
	activeChannels.clear()
}