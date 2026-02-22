import { useState, useCallback, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateField, updateFieldImmediate } from '@/lib/field-handler'
import { getFieldSchema, type EntityType, type EntityDataMap } from '@/lib/schemas'
import { getPendingUpdate, hasPendingUpdate } from '@/lib/focus-wins'
import { useStore } from '@/lib/store'

// ============================================================================
// ТИПЫ
// ============================================================================

interface UseEditableFieldConfig<E extends EntityType> {
	entity: E
	entityId: string
	field: keyof EntityDataMap[E]
	value: any
	debounceMs?: number
	saveMode?: 'auto' | 'manual' | 'hybrid' // ← НОВОЕ!
	onSuccess?: () => void
	onError?: (error: string) => void
}

interface UseEditableFieldReturn {
	// Значения
	localValue: any
	isDirty: boolean
	isUpdating: boolean
	error: string | null

	// НОВОЕ для manual save
	hasUnsavedChanges: boolean
	isSaving: boolean

	// Методы
	handleChange: (value: any) => void
	handleBlur: () => void
	handleKeyDown: (e: React.KeyboardEvent) => void
	reset: () => void

	// НОВОЕ для manual save
	save: () => Promise<void>
	cancel: () => void

	// React Hook Form (опционально)
	register: any
	formState: any
}

// ============================================================================
// ХУК
// ============================================================================

/**
 * Универсальный хук для работы с editable полями
 * 
 * Что он делает:
 * - Управляет локальным состоянием поля
 * - Интегрируется с React Hook Form
 * - Валидирует через Zod
 * - Автоматически синхронизирует с Supabase
 * - Обрабатывает debounce и onBlur
 * 
 * @example
 * const field = useEditableField({
 *   entity: 'tasks',
 *   entityId: taskId,
 *   field: 'title',
 *   value: task.title,
 * })
 */
export function useEditableField<E extends EntityType>(
	config: UseEditableFieldConfig<E>
): UseEditableFieldReturn {
	const {
		entity,
		entityId,
		field,
		value,
		debounceMs = 500,
		saveMode = 'auto', // ← НОВОЕ! По умолчанию auto
		onSuccess,
		onError,
	} = config

	// ========================================================================
	// STATE
	// ========================================================================

	const [isUpdating, setIsUpdating] = useState(false)
	const [isSaving, setIsSaving] = useState(false) // ← НОВОЕ!
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false) // ← НОВОЕ!
	const [error, setError] = useState<string | null>(null)
	const initialValueRef = useRef(value)
	const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// ========================================================================
	// REACT HOOK FORM
	// ========================================================================

	const fieldSchema = getFieldSchema(entity, field)
	const formSchema = z.object({ [field]: fieldSchema })

	const {
		register,
		formState,
		watch,
		setValue,
		reset: resetForm,
	} = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			[field]: value,
		},
		mode: 'onChange',
	})

	const localValue = watch(field as string)

	// ========================================================================
	// СИНХРОНИЗАЦИЯ С ВНЕШНИМ ЗНАЧЕНИЕМ
	// ========================================================================

	useEffect(() => {
		// Обновить локальное значение, если внешнее изменилось
		// (например, от real-time события)
		if (value !== localValue && value !== initialValueRef.current) {
			setValue(field as string, value)
			initialValueRef.current = value
		}
	}, [value, localValue, field, setValue])

	// ========================================================================
	// ОБРАБОТЧИКИ
	// ========================================================================

	/**
	 * Обработка изменения значения
	 * Auto mode: с debounce
	 * Manual mode: только помечает как изменённое
	 */
	const handleChange = useCallback(
		(newValue: any) => {
			setValue(field as string, newValue, { shouldValidate: true })
			setError(null)

			// ====================================================================
			// AUTO MODE: Обычная логика с debounce
			// ====================================================================
			if (saveMode === 'auto') {
				// Очистить предыдущий таймер
				if (updateTimeoutRef.current) {
					clearTimeout(updateTimeoutRef.current)
				}

				// Установить новый таймер
				updateTimeoutRef.current = setTimeout(async () => {
					setIsUpdating(true)

					const result = await updateField(
						{
							entity,
							entityId,
							field,
							value: newValue,
						},
						debounceMs
					)

					setIsUpdating(false)

					if (result.success) {
						initialValueRef.current = newValue
						onSuccess?.()
					} else {
						setError(result.error || 'Update failed')
						onError?.(result.error || 'Update failed')
					}
				}, debounceMs)
			}

			// ====================================================================
			// MANUAL MODE: Только помечаем как изменённое
			// ====================================================================
			else if (saveMode === 'manual') {
				// Очистить debounce если был
				if (updateTimeoutRef.current) {
					clearTimeout(updateTimeoutRef.current)
				}

				// Пометить что есть несохранённые изменения
				setHasUnsavedChanges(true)
			}

			// ====================================================================
			// HYBRID MODE: Debounce + manual trigger
			// ====================================================================
			else if (saveMode === 'hybrid') {
				// Помечаем что есть изменения
				setHasUnsavedChanges(true)

				// И запускаем auto-save с debounce
				if (updateTimeoutRef.current) {
					clearTimeout(updateTimeoutRef.current)
				}

				updateTimeoutRef.current = setTimeout(async () => {
					setIsUpdating(true)

					const result = await updateField(
						{
							entity,
							entityId,
							field,
							value: newValue,
						},
						debounceMs
					)

					setIsUpdating(false)

					if (result.success) {
						initialValueRef.current = newValue
						setHasUnsavedChanges(false)
						onSuccess?.()
					} else {
						setError(result.error || 'Update failed')
						onError?.(result.error || 'Update failed')
					}
				}, debounceMs)
			}
		},
		[entity, entityId, field, debounceMs, setValue, onSuccess, onError]
	)

	/**
	 * Обработка blur
	 * Немедленное сохранение + синхронизация отложенных обновлений
	 */
	const handleBlur = useCallback(async () => {
		// Отменить pending debounce
		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current)
		}

		// Проверить отложенные обновления даже если значение не изменилось
		const checkPending = () => {
			if (hasPendingUpdate(entity, entityId, String(field))) {
				const pendingValue = getPendingUpdate(entity, entityId, String(field))

				if (pendingValue !== null) {
					console.log('[EditableField] Applying pending remote update on blur')
					setValue(String(field), pendingValue)
					// localValue(pendingValue)
					initialValueRef.current = pendingValue
					useStore.getState().updateField(entity, entityId, field, pendingValue)
				}
			}
		}

		// Если значение не изменилось, проверить отложенные и выйти
		if (localValue === initialValueRef.current) {
			checkPending()
			return
		}

		setIsUpdating(true)

		const result = await updateFieldImmediate({
			entity,
			entityId,
			field,
			value: localValue,
		})

		setIsUpdating(false)

		if (result.success) {
			initialValueRef.current = localValue
			onSuccess?.()
			checkPending() // Проверить отложенные после сохранения
		} else {
			setError(result.error || 'Update failed')
			onError?.(result.error || 'Update failed')
		}
	}, [entity, entityId, field, localValue, setValue, onSuccess, onError])

	/**
	 * Обработка клавиш
	 * Enter = save, Escape = cancel
	 */
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleBlur()
			}

			if (e.key === 'Escape') {
				e.preventDefault()
				reset()
			}
		},
		[handleBlur]
	)

	/**
	 * Сброс к исходному значению
	 */
	const reset = useCallback(() => {
		setValue(field as string, initialValueRef.current)
		setError(null)

		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current)
		}
	}, [field, setValue])

	// ========================================================================
	// MANUAL SAVE FUNCTIONS
	// ========================================================================

	/**
	 * Явное сохранение (для manual mode)
	 */
	const save = useCallback(async () => {
		if (!hasUnsavedChanges && saveMode === 'manual') {
			return
		}

		setIsSaving(true)
		setError(null)

		const result = await updateFieldImmediate({
			entity,
			entityId,
			field,
			value: localValue,
		})

		setIsSaving(false)

		if (result.success) {
			initialValueRef.current = localValue
			setHasUnsavedChanges(false)
			onSuccess?.()
		} else {
			setError(result.error || 'Save failed')
			onError?.(result.error || 'Save failed')
		}
	}, [
		entity,
		entityId,
		field,
		localValue,
		hasUnsavedChanges,
		saveMode,
		onSuccess,
		onError,
	])

	/**
	 * Отмена изменений (для manual mode)
	 */
	const cancel = useCallback(() => {
		setValue(field as string, initialValueRef.current)
		setHasUnsavedChanges(false)
		setError(null)

		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current)
		}
	}, [field, setValue])

	// ========================================================================
	// CLEANUP
	// ========================================================================

	useEffect(() => {
		return () => {
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current)
			}
		}
	}, [])

	// ========================================================================
	// RETURN
	// ========================================================================

	return {
		// Values
		localValue,
		isDirty: localValue !== initialValueRef.current,
		isUpdating,
		error,

		// Manual save
		hasUnsavedChanges,
		isSaving,

		// Methods
		handleChange,
		handleBlur,
		handleKeyDown,
		reset,
		save,
		cancel,

		// React Hook Form
		register,
		formState,
	}
}