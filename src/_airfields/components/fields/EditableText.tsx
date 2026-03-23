import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
	label?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	debounceMs?: number;
	saveMode?: "auto" | "manual" | "hybrid"; // ← НОВОЕ!
	showSaveButton?: boolean; // ← НОВОЕ!
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

/**
 * Inline-редактируемое текстовое поле
 *
 * Особенности:
 * - Автосохранение с debounce
 * - Валидация через Zod
 * - Визуальная индикация состояния
 * - Поддержка Enter/Escape
 *
 * @example
 * <EditableText
 *   entity="tasks"
 *   entityId={taskId}
 *   field="title"
 *   value={task.title}
 *   label="Task Title"
 *   placeholder="Enter task title..."
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
	debounceMs = 500,
	saveMode = "auto", // ← НОВОЕ!
	showSaveButton = false, // ← НОВОЕ!
	onSuccess,
	onError,
}: EditableTextProps<E>) {
	const {
		localValue,
		isDirty,
		isUpdating,
		error,
		hasUnsavedChanges,
		isSaving,
		handleChange,
		handleBlur,
		handleKeyDown,
		save,
		cancel,
	} = useEditableField({
		entity,
		entityId,
		field,
		value: value || "",
		debounceMs,
		saveMode, // ← НОВОЕ!
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

			<div className="flex gap-2">
				<Input
					id={`${entity}-${entityId}-${String(field)}`}
					data-entity={entity}
					data-entity-id={entityId}
					data-field={String(field)}
					value={localValue}
					onChange={(e) => handleChange(e.target.value)}
					onBlur={saveMode === "auto" ? handleBlur : undefined}
					onKeyDown={(e) => {
						// Manual mode: Enter = save
						if (e.key === "Enter" && saveMode === "manual") {
							e.preventDefault();
							save();
						} else {
							handleKeyDown(e);
						}
					}}
					placeholder={placeholder}
					disabled={disabled}
					className={cn(
						error &&
							"border-destructive focus-visible:ring-destructive",
						"flex-1"
						// НИКАКИХ других визуальных изменений!
					)}
				/>

				{/* Manual Save Buttons */}
				{(saveMode === "manual" || saveMode === "hybrid") &&
					showSaveButton &&
					hasUnsavedChanges && (
						<div className="flex gap-1 shrink-0">
							<Button
								type="button"
								size="sm"
								onClick={save}
								disabled={isSaving}
							>
								{isSaving ? "Saving..." : "Save"}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={cancel}
								disabled={isSaving}
							>
								Cancel
							</Button>
						</div>
					)}
			</div>

			{/* Ошибка валидации - только если есть */}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
