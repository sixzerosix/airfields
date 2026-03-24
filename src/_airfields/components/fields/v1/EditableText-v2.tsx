import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditableField } from "@/hooks/useEditableField";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// ТИПЫ
// ============================================================================

interface EditableTextProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value: string | undefined | null;

	// ========================================================================
	// UI
	// ========================================================================
	label?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;

	// ========================================================================
	// VALIDATION (NEW!)
	// ========================================================================
	/**
	 * Поле обязательно для заполнения
	 */
	required?: boolean;

	/**
	 * Минимальная длина
	 */
	minLength?: number;

	/**
	 * Максимальная длина
	 */
	maxLength?: number;

	/**
	 * Регулярное выражение для валидации
	 */
	pattern?: RegExp;

	/**
	 * Кастомная функция валидации
	 * @returns true если валидно, строка с ошибкой если невалидно
	 */
	validate?: (value: string) => boolean | string;

	// ========================================================================
	// SAVE MODE
	// ========================================================================
	/**
	 * Режим сохранения
	 * - auto: автоматическое сохранение с debounce + onBlur
	 * - manual: только через внешние кнопки (FieldButtons)
	 * - hybrid: debounce + возможность manual save
	 */
	saveMode?: "auto" | "manual" | "hybrid";

	/**
	 * Задержка debounce в мс
	 * @default 500
	 */
	debounceMs?: number;

	// ========================================================================
	// CALLBACKS
	// ========================================================================
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

/**
 * EditableText - inline-редактируемое текстовое поле
 *
 * ИЗМЕНЕНИЯ В v2.0:
 * - ❌ УБРАНЫ встроенные кнопки (используй FieldButtons)
 * - ✅ ДОБАВЛЕНЫ validation props (required, minLength, etc)
 * - ✅ Cleaner API, проще использовать
 *
 * ИСПОЛЬЗОВАНИЕ:
 *
 * 1. Auto mode (как раньше):
 *    <EntityField name="title" />
 *
 * 2. Manual mode (с FieldButtons):
 *    <FieldGroup>
 *      <EntityField name="title" saveMode="manual" />
 *    </FieldGroup>
 *    <FieldButtons onSubmit={save} onCancel={cancel} />
 *
 * 3. С validation:
 *    <EntityField
 *      name="email"
 *      required
 *      minLength={5}
 *      pattern={/^[^\s@]+@[^\s@]+\.[^\s@]+$/}
 *    />
 *
 * @example
 * <EditableText
 *   entity="tasks"
 *   entityId={taskId}
 *   field="title"
 *   value={task.title}
 *   label="Task Title"
 *   placeholder="Enter task title..."
 *   required
 *   minLength={3}
 *   maxLength={100}
 * />
 */
export function EditableText<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	label,
	placeholder,
	className,
	disabled = false,

	// Validation
	required = false,
	minLength,
	maxLength,
	pattern,
	validate,

	// Save mode
	saveMode = "auto",
	debounceMs = 500,

	// Callbacks
	onSuccess,
	onError,
}: EditableTextProps<E>) {
	// ========================================================================
	// HOOK
	// ========================================================================

	const {
		localValue,
		isDirty,
		isUpdating,
		error,
		handleChange,
		handleBlur,
		handleFocus,
		handleKeyDown,
	} = useEditableField({
		entity,
		entityId,
		field,
		value: value || "",
		debounceMs,
		saveMode,
		onSuccess,
		onError,
	});

	// ========================================================================
	// CLIENT-SIDE VALIDATION (NEW!)
	// ========================================================================

	const [validationError, setValidationError] = React.useState<string | null>(
		null,
	);

	const validateValue = React.useCallback(
		(val: string) => {
			// Required check
			if (required && !val.trim()) {
				return "This field is required";
			}

			// MinLength check
			if (minLength && val.length < minLength) {
				return `Minimum ${minLength} characters required`;
			}

			// MaxLength check
			if (maxLength && val.length > maxLength) {
				return `Maximum ${maxLength} characters allowed`;
			}

			// Pattern check
			if (pattern && val && !pattern.test(val)) {
				return "Invalid format";
			}

			// Custom validation
			if (validate) {
				const result = validate(val);
				if (result !== true) {
					return typeof result === "string"
						? result
						: "Invalid value";
				}
			}

			return null;
		},
		[required, minLength, maxLength, pattern, validate],
	);

	// ========================================================================
	// HANDLERS WITH VALIDATION
	// ========================================================================

	const handleChangeWithValidation = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const newValue = e.target.value;

		// Validate
		const validationErr = validateValue(newValue);
		setValidationError(validationErr);

		// Only save if valid (or empty and not required)
		if (!validationErr || (!required && !newValue)) {
			handleChange(newValue);
		}
	};

	const handleBlurWithValidation = () => {
		const validationErr = validateValue(localValue);
		setValidationError(validationErr);

		// Only trigger blur save if valid
		if (!validationErr) {
			handleBlur();
		}
	};

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div className={cn("space-y-2", className)}>
			{/* ================================================================== */}
			{/* LABEL */}
			{/* ================================================================== */}

			{label && (
				<Label htmlFor={`${entity}-${entityId}-${String(field)}`}>
					{label}
					{required && (
						<span className="text-destructive ml-1">*</span>
					)}
				</Label>
			)}

			{/* ================================================================== */}
			{/* INPUT */}
			{/* ================================================================== */}

			<Input
				id={`${entity}-${entityId}-${String(field)}`}
				// ✅ Data attributes для Focus Wins
				data-entity={entity}
				data-entity-id={entityId}
				data-field={String(field)}
				// Value & handlers
				value={localValue}
				onChange={handleChangeWithValidation}
				onBlur={
					saveMode === "auto" ? handleBlurWithValidation : undefined
				}
				onFocus={handleFocus}
				onKeyDown={(e) => {
					// Manual mode: Enter = trigger blur (будет обработано снаружи)
					if (e.key === "Enter" && saveMode === "manual") {
						e.preventDefault();
						e.currentTarget.blur();
					} else {
						handleKeyDown(e);
					}
				}}
				// UI
				placeholder={placeholder}
				disabled={disabled || isUpdating}
				// Validation attributes
				required={required}
				minLength={minLength}
				maxLength={maxLength}
				// Styling
				className={cn(
					(error || validationError) &&
						"border-destructive focus-visible:ring-destructive",
				)}
			/>

			{/* ================================================================== */}
			{/* ERRORS */}
			{/* ================================================================== */}

			{/* Validation error (client-side) */}
			{validationError && (
				<p className="text-sm text-destructive">{validationError}</p>
			)}

			{/* Server error */}
			{error && !validationError && (
				<p className="text-sm text-destructive">{error}</p>
			)}

			{/* ================================================================== */}
			{/* ПОМОЩЬ (опционально) */}
			{/* ================================================================== */}

			{minLength && maxLength && !error && !validationError && (
				<p className="text-xs text-muted-foreground">
					{localValue.length} / {maxLength} characters
				</p>
			)}
		</div>
	);
}
