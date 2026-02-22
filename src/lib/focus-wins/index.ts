/**
 * Focus Win Strategy - Утилиты для предотвращения конфликтов
 * 
 * Защищает от "прыгающего курсора" когда несколько пользователей
 * редактируют одно и то же поле одновременно
 */

// ============================================================================
// ПРОВЕРКА ФОКУСА
// ============================================================================

/**
 * Проверить, находится ли указанное поле в фокусе
 * 
 * @returns true если пользователь сейчас редактирует это поле
 */
export function isFieldFocused(
	entity: string,
	entityId: string,
	field: string
): boolean {
	const activeElement = document.activeElement

	if (!activeElement) {
		return false
	}

	// Проверяем data-атрибуты активного элемента
	const dataset = (activeElement as HTMLElement).dataset

	return (
		dataset.entity === entity &&
		dataset.entityId === entityId &&
		dataset.field === field
	)
}

/**
 * Проверить, редактирует ли пользователь ЛЮБОЕ поле указанной сущности
 */
export function isEntityBeingEdited(
	entity: string,
	entityId: string
): boolean {
	const activeElement = document.activeElement

	if (!activeElement) {
		return false
	}

	const dataset = (activeElement as HTMLElement).dataset

	return (
		dataset.entity === entity &&
		dataset.entityId === entityId
	)
}

/**
 * Получить информацию о текущем редактируемом поле
 */
export function getCurrentlyEditedField(): {
	entity: string
	entityId: string
	field: string
} | null {
	const activeElement = document.activeElement

	if (!activeElement) {
		return null
	}

	const dataset = (activeElement as HTMLElement).dataset

	if (!dataset.entity || !dataset.entityId || !dataset.field) {
		return null
	}

	return {
		entity: dataset.entity,
		entityId: dataset.entityId,
		field: dataset.field,
	}
}

// ============================================================================
// PENDING EDITS MAP
// ============================================================================

/**
 * Map для хранения "отложенных" обновлений
 * Если пользователь редактирует поле, мы откладываем входящие обновления
 * и применим их после blur
 */
const pendingRemoteUpdates = new Map<string, any>()

/**
 * Сохранить отложенное обновление
 */
export function savePendingUpdate(
	entity: string,
	entityId: string,
	field: string,
	value: any
) {
	const key = `${entity}:${entityId}:${field}`
	pendingRemoteUpdates.set(key, value)

	console.log('[FocusWins] Saved pending update:', key, value)
}

/**
 * Получить и удалить отложенное обновление
 */
export function getPendingUpdate(
	entity: string,
	entityId: string,
	field: string
): any | null {
	const key = `${entity}:${entityId}:${field}`
	const value = pendingRemoteUpdates.get(key)

	if (value !== undefined) {
		pendingRemoteUpdates.delete(key)
		console.log('[FocusWins] Retrieved pending update:', key, value)
		return value
	}

	return null
}

/**
 * Проверить, есть ли отложенные обновления для поля
 */
export function hasPendingUpdate(
	entity: string,
	entityId: string,
	field: string
): boolean {
	const key = `${entity}:${entityId}:${field}`
	return pendingRemoteUpdates.has(key)
}

/**
 * Очистить все отложенные обновления (cleanup)
 */
export function clearAllPendingUpdates() {
	pendingRemoteUpdates.clear()
}

// ============================================================================
// КОНФЛИКТ-МЕНЕДЖЕР
// ============================================================================

/**
 * Определить стратегию разрешения конфликта
 */
export type ConflictResolution =
	| 'local-wins'      // Приоритет локальным изменениям
	| 'remote-wins'     // Приоритет удалённым изменениям
	| 'defer'           // Отложить до blur
	| 'notify-user'     // Показать уведомление пользователю

/**
 * Решить, что делать с входящим обновлением
 */
export function resolveConflict(
	entity: string,
	entityId: string,
	field: string,
	remoteValue: any,
	localValue: any
): ConflictResolution {
	// Если поле в фокусе — откладываем обновление
	if (isFieldFocused(entity, entityId, field)) {
		console.log('[FocusWins] Field is focused, deferring remote update')
		return 'defer'
	}

	// Если значения одинаковые — игнорируем
	if (remoteValue === localValue) {
		return 'local-wins'
	}

	// Если поле не в фокусе — применяем удалённое обновление
	return 'remote-wins'
}

// ============================================================================
// EVENT LISTENERS (опционально)
// ============================================================================

/**
 * Подписаться на события blur для автоматической синхронизации
 * отложенных обновлений
 */
export function setupAutoSyncOnBlur(
	callback: (entity: string, entityId: string, field: string) => void
) {
	const handleBlur = (event: FocusEvent) => {
		const target = event.target as HTMLElement
		const dataset = target.dataset

		if (dataset.entity && dataset.entityId && dataset.field) {
			// Проверить есть ли отложенные обновления
			if (hasPendingUpdate(dataset.entity, dataset.entityId, dataset.field)) {
				callback(dataset.entity, dataset.entityId, dataset.field)
			}
		}
	}

	document.addEventListener('focusout', handleBlur)

	return () => {
		document.removeEventListener('focusout', handleBlur)
	}
}