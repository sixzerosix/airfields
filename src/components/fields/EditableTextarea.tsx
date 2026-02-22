import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEditableField } from "@/hooks/useEditableField";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// ТИПЫ
// ============================================================================

interface EditableTextareaProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value: string | undefined | null;
	label?: string;
	placeholder?: string;
	rows?: number;
	className?: string;
	disabled?: boolean;
	debounceMs?: number;
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

/**
 * Inline-редактируемое многострочное текстовое поле
 *
 * @example
 * <EditableTextarea
 *   entity="tasks"
 *   entityId={taskId}
 *   field="description"
 *   value={task.description}
 *   label="Description"
 *   rows={4}
 * />
 */
export function EditableTextarea<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	label,
	placeholder,
	rows = 3,
	className,
	disabled = false,
	debounceMs = 800, // Больше debounce для textarea
	onSuccess,
	onError,
}: EditableTextareaProps<E>) {
	const {
		localValue,
		isDirty,
		isUpdating,
		error,
		handleChange,
		handleBlur,
		handleKeyDown,
	} = useEditableField({
		entity,
		entityId,
		field,
		value: value || "",
		debounceMs,
		onSuccess,
		onError,
	});

	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<Label htmlFor={`${entity}-${entityId}-${String(field)}`}>
					{label}
				</Label>
			)}

			<Textarea
				id={`${entity}-${entityId}-${String(field)}`}
				data-entity={entity}
				data-entity-id={entityId}
				data-field={String(field)}
				value={localValue}
				onChange={(e) => handleChange(e.target.value)}
				onBlur={handleBlur}
				onKeyDown={(e) => {
					// Для textarea: Ctrl+Enter = save, Escape = cancel
					if (e.key === "Enter" && e.ctrlKey) {
						e.preventDefault();
						handleBlur();
					}
					if (e.key === "Escape") {
						handleKeyDown(e);
					}
				}}
				placeholder={placeholder}
				rows={rows}
				disabled={disabled}
				className={cn(
					"resize-none",
					error &&
						"border-destructive focus-visible:ring-destructive",
					// НИКАКИХ других визуальных изменений!
				)}
			/>

			{/* Ошибка валидации */}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
