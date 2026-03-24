import * as React from "react";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEditableField } from "@/hooks/useEditableField";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// ТИПЫ
// ============================================================================

interface SelectOption {
	value: string;
	label: string;
	icon?: React.ReactNode;
}

interface EditableSelectProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value: string | undefined | null;
	options: SelectOption[];
	label?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

/**
 * Inline-редактируемый select
 *
 * Особенности:
 * - Без debounce (сохранение сразу при выборе)
 * - Незаметное сохранение (как в Notion)
 * - Поддержка иконок в опциях
 *
 * @example
 * <EditableSelect
 *   entity="tasks"
 *   entityId={taskId}
 *   field="priority"
 *   value={task.priority}
 *   options={[
 *     { value: 'low', label: 'Low' },
 *     { value: 'medium', label: 'Medium' },
 *     { value: 'high', label: 'High' },
 *     { value: 'urgent', label: 'Urgent' },
 *   ]}
 * />
 */
export function EditableSelect<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	options,
	label,
	placeholder = "Select...",
	className,
	disabled = false,
	onSuccess,
	onError,
}: EditableSelectProps<E>) {
	const { localValue, error, handleChange } = useEditableField({
		entity,
		entityId,
		field,
		value: value || "",
		debounceMs: 0, // Без debounce для select
		onSuccess,
		onError,
	});

	// Найти выбранную опцию
	const selectedOption = options.find((opt) => opt.value === localValue);

	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<Label htmlFor={`${entity}-${entityId}-${String(field)}`}>
					{label}
				</Label>
			)}

			<Select
				value={localValue}
				onValueChange={handleChange}
				disabled={disabled}
			>
				<SelectTrigger
					id={`${entity}-${entityId}-${String(field)}`}
					data-entity={entity}
					data-entity-id={entityId}
					data-field={String(field)}
					className={cn(
						error &&
							"border-destructive focus-visible:ring-destructive",
						// НИКАКИХ других визуальных изменений!
					)}
				>
					<SelectValue placeholder={placeholder}>
						{selectedOption && (
							<div className="flex items-center gap-2">
								{selectedOption.icon}
								<span>{selectedOption.label}</span>
							</div>
						)}
					</SelectValue>
				</SelectTrigger>

				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							<div className="flex items-center gap-2">
								{option.icon}
								<span>{option.label}</span>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Ошибка валидации */}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
