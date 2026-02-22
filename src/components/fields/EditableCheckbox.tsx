import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEditableField } from "@/hooks/useEditableField";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EditableCheckboxProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value: boolean | undefined | null;

	// UI
	label?: string;
	description?: string;
	className?: string;
	disabled?: boolean;

	// Callbacks
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EditableCheckbox - Boolean поле с auto-save
 *
 * Использует shadcn/ui Checkbox
 * Сохраняется сразу при изменении (без debounce)
 *
 * @example
 * <EditableCheckbox
 *   entity="tasks"
 *   entityId={taskId}
 *   field="is_completed"
 *   value={task.is_completed}
 *   label="Mark as completed"
 *   description="Check to mark this task as done"
 * />
 */
export function EditableCheckbox<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	label,
	description,
	className,
	disabled = false,
	onSuccess,
	onError,
}: EditableCheckboxProps<E>) {
	// ========================================================================
	// EDITABLE FIELD HOOK
	// ========================================================================

	const { localValue, error, handleChange } = useEditableField({
		entity,
		entityId,
		field,
		value: value ?? false,
		debounceMs: 0, // No debounce for checkbox
		onSuccess,
		onError,
	});

	// ========================================================================
	// HANDLERS
	// ========================================================================

	const handleCheckedChange = (checked: boolean) => {
		handleChange(checked);
	};

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex items-start space-x-3">
				<Checkbox
					id={`${entity}-${entityId}-${String(field)}`}
					data-entity={entity}
					data-entity-id={entityId}
					data-field={String(field)}
					checked={!!localValue}
					onCheckedChange={handleCheckedChange}
					disabled={disabled}
					className={cn(error && "border-destructive")}
				/>

				<div className="grid gap-1.5 leading-none">
					{label && (
						<Label
							htmlFor={`${entity}-${entityId}-${String(field)}`}
							className="cursor-pointer"
						>
							{label}
						</Label>
					)}

					{description && (
						<p className="text-sm text-muted-foreground">
							{description}
						</p>
					)}
				</div>
			</div>

			{/* Error */}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
