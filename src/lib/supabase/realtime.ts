// lib/supabase/realtime.ts
import { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient } from './client'
import { useStore } from '../store'
import type { EntityType, EntityDataMap } from '../schemas'

// Один канал на сущность — больше не нужно per-id
const activeTableChannels = new Map<EntityType, RealtimeChannel>()

export function subscribeToEntity<E extends EntityType>(entity: E) {
	// Если канал уже есть — ничего не делаем
	if (activeTableChannels.has(entity)) {
		return () => { } // пустая отписка, т.к. канал глобальный
	}

	const supabase = getSupabaseClient()
	const channel = supabase
		.channel(`table:${entity}`)
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: entity },
			(payload) => {
				handleRealtimeEvent(entity, payload as any)
			}
		)
		.subscribe((status) => {
			if (status === 'SUBSCRIBED') {
				console.log(`[Realtime] Subscribed to table "${entity}"`)
			}
			if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
				console.warn(`[Realtime] Channel error for ${entity}, reconnecting...`)
				setTimeout(() => {
					unsubscribeFromEntity(entity)
					subscribeToEntity(entity)
				}, 2000)
			}
		})

	activeTableChannels.set(entity, channel)

	return () => {
		// Ничего не делаем — канал остаётся жить
	}
}

// Отписка (вызывается только при размонтировании приложения)
export function unsubscribeFromEntity(entity: EntityType) {
	const channel = activeTableChannels.get(entity)
	if (channel) {
		const supabase = getSupabaseClient()
		supabase.removeChannel(channel)
		activeTableChannels.delete(entity)
	}
}

export function unsubscribeFromAll() {
	const supabase = getSupabaseClient()
	activeTableChannels.forEach((ch) => supabase.removeChannel(ch))
	activeTableChannels.clear()
}

// ============================================================================
// ОБРАБОТКА СОБЫТИЙ (оставляем как было)
// ============================================================================

function handleRealtimeEvent<E extends EntityType>(entity: E, payload: any) {
	const { eventType, new: newRecord, old: oldRecord } = payload

	console.log(`[Realtime] ${eventType} on ${entity}`, { newRecord, oldRecord })

	const store = useStore.getState()

	switch (eventType) {
		case 'INSERT':
			if (newRecord) store.upsertEntity(entity, newRecord.id, newRecord)
			break
		case 'UPDATE':
			if (newRecord) store.upsertEntity(entity, newRecord.id, newRecord)
			break
		case 'DELETE':
			if (oldRecord?.id) store.deleteEntity(entity, oldRecord.id)
			break
	}
}