import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { updateField, updateFieldImmediate } from '@/lib/field-handler'
import { getFieldSchema, EntityType, EntityDataMap } from '@/lib/schemas'
import type { KeyboardEvent } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export type SaveMode = 'auto' | 'manual' | 'hybrid'

export interface UseEditableFieldConfig<E extends EntityType> {
  entity: E
  entityId: string
  field: keyof EntityDataMap[E]
  value: any

  /**
   * Режим сохранения
   * - auto: debounce + onBlur
   * - manual: только через save()
   * - hybrid: debounce + возможность manual save()
   * 
   * @default 'auto'
   */
  saveMode?: SaveMode

  /**
   * Задержка debounce (мс)
   * @default 500
   */
  debounceMs?: number

  /**
   * Callbacks
   */
  onSuccess?: () => void
  onError?: (error: string) => void
}

export interface UseEditableFieldReturn {
  // State
  localValue: any
  isDirty: boolean
  isUpdating: boolean
  error: string | null

  // Manual mode specific
  hasUnsavedChanges: boolean
  isSaving: boolean

  // Handlers
  handleChange: (value: any) => void
  handleFocus: () => void
  handleBlur: () => void
  handleKeyDown: (e: KeyboardEvent) => void

  // Manual save methods
  save: () => Promise<void>
  cancel: () => void
  reset: () => void
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useEditableField v2 - БЕЗ React Hook Form!
 * 
 * Главный хук для всех editable полей.
 * Управляет состоянием, валидацией, debounce и синхронизацией.
 * 
 * ИЗМЕНЕНИЯ В v2:
 * - ✅ Убран React Hook Form (был overhead!)
 * - ✅ Простой useState вместо useForm
 * - ✅ Прямая валидация через Zod
 * - ✅ Меньше кода, проще понять
 * - ✅ Быстрее работает
 * 
 * @example
 * const {
 *   localValue,
 *   handleChange,
 *   handleBlur
 * } = useEditableField({
 *   entity: 'tasks',
 *   entityId: 'task-123',
 *   field: 'title',
 *   value: task.title,
 *   saveMode: 'auto'
 * })
 */
export function useEditableField<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  saveMode = 'auto',
  debounceMs = 500,
  onSuccess,
  onError,
}: UseEditableFieldConfig<E>): UseEditableFieldReturn {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [localValue, setLocalValue] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const initialValueRef = useRef(value)
  const isMountedRef = useRef(true)

  // ==========================================================================
  // SYNC localValue с Store (remote updates)
  // ==========================================================================

  // Читаем из Store
  const storeEntity = useStore((state) => state.entities[entity]?.[entityId])
  const storeValue = storeEntity?.[field as keyof typeof storeEntity]

  useEffect(() => {
    // Если поле в фокусе - не обновляем (Focus Wins!)
    if (isFocused) return

    // Синхронизация с Store (приоритет у storeValue!)
    const actualValue = storeValue !== undefined ? storeValue : value

    if (actualValue !== localValue) {
      setLocalValue(actualValue)
      setHasUnsavedChanges(false)
    }
  }, [storeValue, value, isFocused, localValue])

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      // Cancel pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validateValue = useCallback((val: any): string | null => {
    try {
      const schema = getFieldSchema(entity, field as any)
      schema.parse(val)
      return null
    } catch (err: any) {
      const message = err.errors?.[0]?.message || 'Validation error'
      return message
    }
  }, [entity, field])

  // ==========================================================================
  // SAVE LOGIC
  // ==========================================================================

  const performSave = useCallback(async (valueToSave: any, immediate = false) => {
    // Validate
    const validationError = validateValue(valueToSave)
    if (validationError) {
      setError(validationError)
      onError?.(validationError)
      return
    }

    // Clear error
    setError(null)
    setIsUpdating(true)

    try {
      // Use immediate or debounced update
      const updateFn = immediate ? updateFieldImmediate : updateField

      await updateFn({
        entity,
        entityId,
        field: field as string,
        value: valueToSave,
        debounceMs: immediate ? 0 : debounceMs,
      })

      if (isMountedRef.current) {
        setHasUnsavedChanges(false)
        onSuccess?.()
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        const errorMsg = err.message || 'Failed to save'
        setError(errorMsg)
        onError?.(errorMsg)
      }
    } finally {
      if (isMountedRef.current) {
        setIsUpdating(false)
      }
    }
  }, [entity, entityId, field, debounceMs, validateValue, onSuccess, onError])

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleChange = useCallback((newValue: any) => {
    setLocalValue(newValue)
    setHasUnsavedChanges(true)

    // Auto or Hybrid mode → debounced save
    if (saveMode === 'auto' || saveMode === 'hybrid') {
      // Cancel previous debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Start new debounce
      debounceTimerRef.current = setTimeout(() => {
        performSave(newValue, false)
      }, debounceMs)
    }

    // Manual mode → только локальное обновление
    // Сохранение через save() кнопку
  }, [saveMode, debounceMs, performSave])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)

    // Auto mode → immediate save on blur
    if (saveMode === 'auto' && hasUnsavedChanges) {
      // Cancel debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Immediate save
      performSave(localValue, true)
    }
  }, [saveMode, hasUnsavedChanges, localValue, performSave])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Enter → blur (triggers save in auto mode)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
        ; (e.target as HTMLElement).blur()
    }

    // Escape → cancel changes
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
        ; (e.target as HTMLElement).blur()
    }
  }, [])

  // ==========================================================================
  // MANUAL SAVE METHODS
  // ==========================================================================

  const save = useCallback(async () => {
    await performSave(localValue, true)
  }, [localValue, performSave])

  const cancel = useCallback(() => {
    setLocalValue(value)
    setHasUnsavedChanges(false)
    setError(null)
  }, [value])

  const reset = useCallback(() => {
    setLocalValue(initialValueRef.current)
    setHasUnsavedChanges(true)
    setError(null)
  }, [])

  // ==========================================================================
  // COMPUTED STATE
  // ==========================================================================

  const isDirty = localValue !== value

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    localValue,
    isDirty,
    isUpdating,
    error,

    // Manual mode
    hasUnsavedChanges,
    isSaving: isUpdating,

    // Handlers
    handleChange,
    handleFocus,
    handleBlur,
    handleKeyDown,

    // Manual methods
    save,
    cancel,
    reset,
  }
}