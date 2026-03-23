import { useStore } from '../store'
import { validateField, type EntityType, type EntityDataMap } from '../schemas'
import { offlineManager } from '../offline/manager'
import { toast } from 'sonner'
import { updateEntityAction, batchUpdateEntityAction } from '@/actions/update-entity'

// ============================================================================
// ТИПЫ
// ============================================================================

interface FieldUpdateConfig<E extends EntityType> {
	entity: E
	entityId: string
	field: keyof EntityDataMap[E]
	value: any
}

interface FieldUpdateResult {
	success: boolean
	error?: string
}

// ============================================================================
// DEBOUNCE MAP
// ============================================================================

const debounceTimers = new Map<string, NodeJS.Timeout>()
const pendingUpdates = new Map<string, boolean>()

// ============================================================================
// УНИВЕРСАЛЬНЫЙ FIELD HANDLER - ПОЛНОСТЬЮ НЕВИДИМЫЙ
// ============================================================================

/**
 * Главная функция для обновления полей
 * 
 * ФИЛОСОФИЯ:
 * - Пользователь НЕ ВИДИТ процесс сохранения
 * - Всё работает под капотом
 * - Toast только для критических ошибок
 * - Offline mode с автосинхронизацией
 * 
 * @param config - Конфигурация обновления
 * @param debounceMs - Задержка перед отправкой (default: 500ms)
 */
export async function updateField<E extends EntityType>(
	config: FieldUpdateConfig<E>,
	debounceMs: number = 500
): Promise<FieldUpdateResult> {
	const { entity, entityId, field, value } = config
	const updateKey = `${entity}:${entityId}:${String(field)}`

	// ========================================================================
	// ВАЛИДАЦИЯ
	// ========================================================================
	const validation = validateField(entity, field, value)

	if (!validation.success) {
		// Показать ошибку валидации через toast
		toast.error('Validation error', {
			description: validation.error,
		})

		return {
			success: false,
			error: validation.error,
		}
	}

	// ========================================================================
	// OPTIMISTIC UPDATE (мгновенно, без индикации)
	// ========================================================================
	const previousValue = useStore.getState().entities[entity]?.[entityId]?.[field]

	useStore.getState().updateField(entity, entityId, field, value)

	// ========================================================================
	// ПРОВЕРКА OFFLINE
	// ========================================================================

	if (!offlineManager.getIsOnline()) {
		// Добавить в offline очередь
		offlineManager.addToQueue({
			entity,
			entityId,
			field: field as string,
			value,
		})

		// Вернуть success — пользователь не видит разницы
		return { success: true }
	}

	// ========================================================================
	// DEBOUNCE
	// ========================================================================

	// Очистить предыдущий таймер
	const existingTimer = debounceTimers.get(updateKey)
	if (existingTimer) {
		clearTimeout(existingTimer)
	}

	// Создать новый промис для debounce
	return new Promise((resolve) => {
		const timer = setTimeout(async () => {
			// Проверить, не идёт ли уже обновление
			if (pendingUpdates.get(updateKey)) {
				resolve({ success: true })
				return
			}

			pendingUpdates.set(updateKey, true)

			try {
				// ==================================================================
				// SERVER ACTION (через next-safe-action)
				// ==================================================================
				const result = await updateEntityAction({
					entity,
					entityId,
					field: String(field),
					value,
				})

				// Проверить результат action
				if (result?.serverError) {
					// Server error (не валидация)
					const errorMsg = result.serverError

					// Проверить сетевые ошибки (означает offline)
					if (
						errorMsg.includes('fetch') ||
						errorMsg.includes('network') ||
						errorMsg.includes('Failed to fetch')
					) {
						// OFFLINE — сохранить в очередь
						console.log('[FieldHandler] Offline detected, queuing update')
						offlineManager.addToQueue({
							entity,
							entityId,
							field: String(field),
							value,
						})
						resolve({ success: true })
						return
					}

					// Откат optimistic update
					useStore.getState().updateField(entity, entityId, field, previousValue)

					// Показать ошибку ТОЛЬКО если не RLS
					if (!errorMsg.includes('policy')) {
						toast.error('Failed to save', {
							description: 'Your changes couldn\'t be saved. Please try again.',
						})
					}

					resolve({
						success: false,
						error: errorMsg,
					})
				} else if (result?.validationErrors) {
					// Validation error
					console.error('[FieldHandler] Validation failed:', result.validationErrors)

					useStore.getState().updateField(entity, entityId, field, previousValue)

					toast.error('Validation error', {
						description: 'The value you entered is not valid.',
					})

					resolve({
						success: false,
						error: 'Validation failed',
					})
				} else if (result?.data) {
					// SUCCESS — пользователь ничего не видит!
					console.log('[FieldHandler] Success via Server Action')
					resolve({ success: true })
				} else {
					// Неизвестная ошибка
					throw new Error('Unknown Server Action result')
				}
			} catch (err) {
				// Network error или другая критическая ошибка
				console.error('[FieldHandler] Error:', err)

				// Проверить offline
				if (!navigator.onLine || err instanceof TypeError) {
					// OFFLINE — сохранить в очередь
					console.log('[FieldHandler] Offline detected (catch), queuing update')
					offlineManager.addToQueue({
						entity,
						entityId,
						field: String(field),
						value,
					})
					resolve({ success: true })
					return
				}

				// Откат при любой ошибке
				useStore.getState().updateField(entity, entityId, field, previousValue)

				// Показать ошибку
				toast.error('Connection error', {
					description: 'Please check your internet connection.',
				})

				resolve({
					success: false,
					error: err instanceof Error ? err.message : 'Unknown error',
				})
			} finally {
				pendingUpdates.delete(updateKey)
				debounceTimers.delete(updateKey)
			}
		}, debounceMs)

		debounceTimers.set(updateKey, timer)
	})
}

// ============================================================================
// FORCED UPDATE (без debounce)
// ============================================================================

export async function updateFieldImmediate<E extends EntityType>(
	config: FieldUpdateConfig<E>
): Promise<FieldUpdateResult> {
	const updateKey = `${config.entity}:${config.entityId}:${String(config.field)}`

	// Отменить pending debounce
	const existingTimer = debounceTimers.get(updateKey)
	if (existingTimer) {
		clearTimeout(existingTimer)
		debounceTimers.delete(updateKey)
	}

	return updateField(config, 0)
}

// ============================================================================
// BATCH UPDATE
// ============================================================================

export async function updateFieldsBatch<E extends EntityType>(
	entity: E,
	entityId: string,
	updates: Partial<EntityDataMap[E]>
): Promise<FieldUpdateResult> {
	try {
		// Валидация всех полей
		for (const [field, value] of Object.entries(updates)) {
			const validation = validateField(entity, field as any, value)
			if (!validation.success) {
				toast.error('Validation error', {
					description: `${field}: ${validation.error}`,
				})
				return {
					success: false,
					error: `${field}: ${validation.error}`,
				}
			}
		}

		// Optimistic update
		useStore.getState().upsertEntity(entity, entityId, updates)

		// Проверка offline
		if (!offlineManager.getIsOnline()) {
			// Добавить в очередь
			for (const [field, value] of Object.entries(updates)) {
				offlineManager.addToQueue({
					entity,
					entityId,
					field,
					value,
				})
			}
			return { success: true }
		}

		// Отправка через Server Action
		const result = await batchUpdateEntityAction({
			entity,
			entityId,
			updates,
		})

		if (result?.serverError || result?.validationErrors) {
			const errorMsg = result.serverError || 'Validation failed'

			toast.error('Failed to save', {
				description: 'Your changes couldn\'t be saved.',
			})
			return {
				success: false,
				error: errorMsg,
			}
		}

		return { success: true }
	} catch (err) {
		toast.error('Connection error', {
			description: 'Please check your internet connection.',
		})
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error',
		}
	}
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

export function cancelAllPendingUpdates() {
	debounceTimers.forEach((timer) => clearTimeout(timer))
	debounceTimers.clear()
	pendingUpdates.clear()
}

export function isUpdatePending(entity: string, entityId: string, field: string): boolean {
	const updateKey = `${entity}:${entityId}:${field}`
	return pendingUpdates.get(updateKey) || false
}