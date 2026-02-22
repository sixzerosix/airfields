import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEditableField } from "@/hooks/useEditableField";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EditableSwitchProps<E extends EntityType> {
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
 * EditableSwitch - Toggle switch с auto-save
 *
 * Использует shadcn/ui Switch
 * Сохраняется сразу при изменении (без debounce)
 *
 * @example
 * <EditableSwitch
 *   entity="tasks"
 *   entityId={taskId}
 *   field="is_active"
 *   value={task.is_active}
 *   label="Active"
 *   description="Enable or disable this task"
 * />
 */
export function EditableSwitch<E extends EntityType>({
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
}: EditableSwitchProps<E>) {
	// ========================================================================
	// EDITABLE FIELD HOOK
	// ========================================================================

	const { localValue, error, handleChange } = useEditableField({
		entity,
		entityId,
		field,
		value: value ?? false,
		debounceMs: 0, // No debounce for switch
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
			<div className="flex items-center justify-between space-x-3">
				<div className="flex-1 space-y-1">
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

				<Switch
					id={`${entity}-${entityId}-${String(field)}`}
					data-entity={entity}
					data-entity-id={entityId}
					data-field={String(field)}
					checked={!!localValue}
					onCheckedChange={handleCheckedChange}
					disabled={disabled}
					className={cn(error && "border-destructive")}
				/>
			</div>

			{/* Error */}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
