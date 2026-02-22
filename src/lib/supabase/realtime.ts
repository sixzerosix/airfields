import { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient } from './client'
import { useStore } from '../store'
import type { EntityType, EntityDataMap } from '../schemas'
import {
	isFieldFocused,
	savePendingUpdate,
	resolveConflict,
} from '../focus-wins'

// ============================================================================
// ТИПЫ
// ============================================================================

interface RealtimeEvent<E extends EntityType> {
	eventType: 'INSERT' | 'UPDATE' | 'DELETE'
	new: EntityDataMap[E] | null
	old: Partial<EntityDataMap[E]> | null
}

// ============================================================================
// ПОДПИСКИ
// ============================================================================

/**
 * Map активных каналов
 * Используется для управления подписками
 */
const activeChannels = new Map<string, RealtimeChannel>()

/**
 * Подписаться на изменения сущности
 * 
 * @param entity - Тип сущности ('tasks', 'projects')
 * @param filter - Дополнительный фильтр (опционально)
 */
export function subscribeToEntity<E extends EntityType>(
	entity: E,
	filter?: { column: string; value: string }
) {
	const channelKey = filter
		? `${entity}:${filter.column}:${filter.value}`
		: entity

	// Проверить, есть ли уже активная подписка
	if (activeChannels.has(channelKey)) {
		console.log(`[Realtime] Already subscribed to ${channelKey}`)
		return () => unsubscribeFromEntity(channelKey)
	}

	console.log(`[Realtime] Subscribing to ${channelKey}`)

	// Получить supabase client
	const supabase = getSupabaseClient()

	// Создать канал
	let channel = supabase.channel(`realtime:${channelKey}`)

	// Настроить подписку
	if (filter) {
		channel = channel.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: entity,
				filter: `${filter.column}=eq.${filter.value}`,
			},
			(payload) => handleRealtimeEvent(entity, payload as any)
		)
	} else {
		channel = channel.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: entity,
			},
			(payload) => handleRealtimeEvent(entity, payload as any)
		)
	}

	// Подписаться
	channel.subscribe((status) => {
		if (status === 'SUBSCRIBED') {
			console.log(`[Realtime] Subscribed to ${channelKey}`)
		}
		if (status === 'CHANNEL_ERROR') {
			console.error(`[Realtime] Error subscribing to ${channelKey}`)
		}
	})

	activeChannels.set(channelKey, channel)

	// Вернуть функцию для отписки
	return () => unsubscribeFromEntity(channelKey)
}

/**
 * Отписаться от сущности
 */
function unsubscribeFromEntity(channelKey: string) {
	const channel = activeChannels.get(channelKey)

	if (channel) {
		console.log(`[Realtime] Unsubscribing from ${channelKey}`)
		const supabase = getSupabaseClient()
		supabase.removeChannel(channel)
		activeChannels.delete(channelKey)
	}
}

/**
 * Отписаться от всех каналов
 * Используется при cleanup (unmount приложения)
 */
export function unsubscribeFromAll() {
	console.log('[Realtime] Unsubscribing from all channels')
	const supabase = getSupabaseClient()
	activeChannels.forEach((channel, key) => {
		supabase.removeChannel(channel)
	})
	activeChannels.clear()
}

// ============================================================================
// ОБРАБОТКА СОБЫТИЙ
// ============================================================================

/**
 * Обработать real-time событие от Supabase
 */
function handleRealtimeEvent<E extends EntityType>(
	entity: E,
	payload: RealtimeEvent<E>
) {
	const { eventType, new: newRecord, old: oldRecord } = payload

	console.log(`[Realtime] ${eventType} on ${entity}`, { newRecord, oldRecord })

	switch (eventType) {
		case 'INSERT':
			if (newRecord) {
				handleInsert(entity, newRecord)
			}
			break

		case 'UPDATE':
			if (newRecord) {
				handleUpdate(entity, newRecord)
			}
			break

		case 'DELETE':
			if (oldRecord && 'id' in oldRecord) {
				handleDelete(entity, (oldRecord as any).id)
			}
			break

		default:
			console.warn(`[Realtime] Unknown event type: ${eventType}`)
	}
}

/**
 * Обработать INSERT
 */
function handleInsert<E extends EntityType>(
	entity: E,
	record: EntityDataMap[E]
) {
	const store = useStore.getState()
	store.upsertEntity(entity, (record as any).id, record)
}

/**
 * Обработать UPDATE с Focus Wins защитой
 */
function handleUpdate<E extends EntityType>(
	entity: E,
	record: EntityDataMap[E]
) {
	const store = useStore.getState()

	// ОШИБКА БЫЛА ТУТ: данные лежат в store.entities
	const entityMap = store.entities[entity]

	// Защита от undefined, если стор еще не инициализирован
	if (!entityMap) {
		console.log(`[Realtime] Initializing ${entity} map from update`)
		store.upsertEntity(entity, (record as any).id, record)
		return
	}

	const existingRecord = entityMap[(record as any).id]

	if (!existingRecord) {
		// Новая запись (возможно, пришла от другого пользователя)
		store.upsertEntity(entity, (record as any).id, record)
		return
	}

	// Проверка на конфликт (простейший вариант — last-write-wins)
	const existingUpdatedAt = new Date(existingRecord.updated_at).getTime()
	const newUpdatedAt = new Date(record.updated_at).getTime()

	if (newUpdatedAt <= existingUpdatedAt) {
		console.log('[Realtime] Skipping older update')
		return
	}

	// ========================================================================
	// FOCUS WINS ЗАЩИТА
	// ========================================================================

	// Создаём копию записи для обновления
	const updatedRecord = { ...record }
	let hasConflicts = false

	// Проверяем каждое поле на конфликт
	for (const field of Object.keys(record) as Array<keyof EntityDataMap[E]>) {
		const fieldStr = String(field)
		const remoteValue = record[field]
		const localValue = existingRecord[field]

		// Проверяем фокус на этом поле
		if (isFieldFocused(entity, (record as any).id, fieldStr)) {
			// ПОЛЕ В ФОКУСЕ — откладываем обновление
			console.log(`[Realtime] Field ${entity}.${fieldStr} is focused, deferring update`)

			// Сохраняем отложенное обновление
			savePendingUpdate(entity, (record as any).id, fieldStr, remoteValue)

			// Оставляем локальное значение
			updatedRecord[field] = localValue
			hasConflicts = true
		} else {
			// Поле не в фокусе — применяем удалённое значение
			const resolution = resolveConflict(
				entity,
				(record as any).id,
				fieldStr,
				remoteValue,
				localValue
			)

			if (resolution === 'defer') {
				savePendingUpdate(entity, (record as any).id, fieldStr, remoteValue)
				updatedRecord[field] = localValue
				hasConflicts = true
			} else if (resolution === 'local-wins') {
				updatedRecord[field] = localValue
			} else {
				// remote-wins (по умолчанию)
				updatedRecord[field] = remoteValue
			}
		}
	}

	// Применяем обновление
	store.applyRemoteUpdate(entity, (record as any).id, updatedRecord)

	if (hasConflicts) {
		console.log('[Realtime] Some fields deferred due to focus conflicts')
	}
}

/**
 * Обработать DELETE
 */
function handleDelete(entity: EntityType, id: string) {
	const store = useStore.getState()
	store.deleteEntity(entity, id)
}

// ============================================================================
// ХЕЛПЕРЫ
// ============================================================================

/**
 * Получить список активных подписок
 */
export function getActiveSubscriptions(): string[] {
	return Array.from(activeChannels.keys())
}

/**
 * Проверить, активна ли подписка
 */
export function isSubscribed(entity: EntityType): boolean {
	return activeChannels.has(entity)
}