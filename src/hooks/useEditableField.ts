import { useState, useCallback, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateField, updateFieldImmediate } from '@/lib/field-handler'
import { getFieldSchema, type EntityType, type EntityDataMap } from '@/lib/schemas'
import { getPendingUpdate, hasPendingUpdate } from '@/lib/focus-wins'
import { useStore } from '@/lib/store'
import { useIsDraft } from '@/contexts/DraftContext' // ← ДОБАВЛЕНО

// ============================================================================
// ТИПЫ
// ============================================================================

interface UseEditableFieldConfig<E extends EntityType> {
	entity: E
	entityId: string
	field: keyof EntityDataMap[E]
	value: any
	debounceMs?: number
	saveMode?: 'auto' | 'manual' | 'hybrid'
	onSuccess?: () => void
	onError?: (error: string) => void
}

interface UseEditableFieldReturn {
	localValue: any
	isDirty: boolean
	isUpdating: boolean
	error: string | null
	hasUnsavedChanges: boolean
	isSaving: boolean
	handleChange: (value: any) => void
	handleBlur: () => void
	handleFocus: () => void
	handleKeyDown: (e: React.KeyboardEvent) => void
	reset: () => void
	save: () => Promise<void>
	cancel: () => void
	register: any
	formState: any
}

// ============================================================================
// ХУК
// ============================================================================

export function useEditableField<E extends EntityType>(
	config: UseEditableFieldConfig<E>
): UseEditableFieldReturn {
	const {
		entity,
		entityId,
		field,
		value,
		debounceMs = 500,
		saveMode: saveModeFromProps = 'auto',
		onSuccess,
		onError,
	} = config

	// ========================================================================
	// ✅ DRAFT CONTEXT — принудительный manual режим при создании
	// ========================================================================
	//
	// Если компонент внутри DraftContext (CreateEntityDialog, CreateEntityPage)
	// → всегда manual, независимо от того что передали в props.
	//
	// Это ЕДИНСТВЕННОЕ место где нужен фикс.
	// Все 7 компонентов (EditableText, EditableTextarea, EditableSelect,
	// EditableCheckbox, EditableDate, EditableSwitch, ReferencePicker)
	// используют этот хук → ВСЕ автоматически работают правильно.

	const isDraft = useIsDraft()
	const saveMode = isDraft ? 'manual' : saveModeFromProps

	// ========================================================================
	// STATE
	// ========================================================================

	const [isUpdating, setIsUpdating] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
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
		if (value !== localValue && value !== initialValueRef.current) {
			setValue(field as string, value)
			initialValueRef.current = value
		}
	}, [value, localValue, field, setValue])

	// ========================================================================
	// ОБРАБОТЧИКИ
	// ========================================================================

	const handleChange = useCallback(
		(newValue: any) => {
			setValue(field as string, newValue, { shouldValidate: true })
			setError(null)

			// ================================================================
			// MANUAL MODE: только Store, НЕ вызываем updateEntityAction
			// ================================================================
			if (saveMode === 'manual') {
				if (updateTimeoutRef.current) {
					clearTimeout(updateTimeoutRef.current)
				}

				// ✅ Пишем в Store чтобы create() потом забрал данные
				useStore.getState().updateField(entity, entityId, field, newValue)
				setHasUnsavedChanges(true)
				return // ← ВЫХОД! Не вызываем updateField/updateFieldImmediate
			}

			// ================================================================
			// AUTO MODE
			// ================================================================
			if (saveMode === 'auto') {
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
						onSuccess?.()
					} else {
						setError(result.error || 'Update failed')
						onError?.(result.error || 'Update failed')
					}
				}, debounceMs)
			}

			// ================================================================
			// HYBRID MODE
			// ================================================================
			else if (saveMode === 'hybrid') {
				setHasUnsavedChanges(true)

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
		[entity, entityId, field, debounceMs, saveMode, setValue, onSuccess, onError]
	)

	const handleFocus = useCallback(() => {
		// Placeholder for Focus Wins integration
	}, [])

	const handleBlur = useCallback(async () => {
		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current)
		}

		// ✅ Manual mode: НЕ сохраняем на blur
		if (saveMode === 'manual') {
			return
		}

		// Проверить отложенные обновления
		const checkPending = () => {
			if (hasPendingUpdate(entity, entityId, String(field))) {
				const pendingValue = getPendingUpdate(entity, entityId, String(field))
				if (pendingValue !== null) {
					setValue(String(field), pendingValue)
					initialValueRef.current = pendingValue
					useStore.getState().updateField(entity, entityId, field, pendingValue)
				}
			}
		}

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
			checkPending()
		} else {
			setError(result.error || 'Update failed')
			onError?.(result.error || 'Update failed')
		}
	}, [entity, entityId, field, localValue, saveMode, setValue, onSuccess, onError])

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

	const reset = useCallback(() => {
		setValue(field as string, initialValueRef.current)
		setError(null)

		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current)
		}
	}, [field, setValue])

	// ========================================================================
	// MANUAL SAVE
	// ========================================================================

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
	}, [entity, entityId, field, localValue, hasUnsavedChanges, saveMode, onSuccess, onError])

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
		localValue,
		isDirty: localValue !== initialValueRef.current,
		isUpdating,
		error,
		hasUnsavedChanges,
		isSaving,
		handleChange,
		handleFocus,
		handleBlur,
		handleKeyDown,
		reset,
		save,
		cancel,
		register,
		formState,
	}
}