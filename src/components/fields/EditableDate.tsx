import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useEditableField } from "@/hooks/useEditableField";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// ТИПЫ
// ============================================================================

interface EditableDateProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value: string | undefined | null;
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
 * Inline-редактируемое поле даты с календарём
 *
 * Особенности:
 * - Красивый календарь из ShadcnUI
 * - Незаметное сохранение
 * - Поддержка очистки даты
 *
 * @example
 * <EditableDate
 *   entity="tasks"
 *   entityId={taskId}
 *   field="due_date"
 *   value={task.due_date}
 *   label="Due Date"
 * />
 */
export function EditableDate<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	label,
	placeholder = "Pick a date",
	className,
	disabled = false,
	onSuccess,
	onError,
}: EditableDateProps<E>) {
	const [open, setOpen] = React.useState(false);

	const { localValue, error, handleChange } = useEditableField({
		entity,
		entityId,
		field,
		value: value || null,
		debounceMs: 0, // Без debounce для даты
		onSuccess,
		onError,
	});

	// Конвертировать ISO string в Date
	const selectedDate = localValue ? new Date(localValue) : undefined;

	// Обработчик выбора даты
	const handleSelect = (date: Date | undefined) => {
		if (date) {
			// Конвертировать в ISO string для Supabase
			const isoString = date.toISOString();
			handleChange(isoString);
			setOpen(false);
		} else {
			// Очистить дату
			handleChange(null);
			setOpen(false);
		}
	};

	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<Label htmlFor={`${entity}-${entityId}-${String(field)}`}>
					{label}
				</Label>
			)}

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						id={`${entity}-${entityId}-${String(field)}`}
						data-entity={entity}
						data-entity-id={entityId}
						data-field={String(field)}
						variant="outline"
						className={cn(
							"w-full justify-start text-left font-normal",
							!selectedDate && "text-muted-foreground",
							error && "border-destructive",
							// НИКАКИХ других визуальных изменений!
						)}
						disabled={disabled}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{selectedDate ? (
							format(selectedDate, "PPP")
						) : (
							<span>{placeholder}</span>
						)}
					</Button>
				</PopoverTrigger>

				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={selectedDate}
						onSelect={handleSelect}
						initialFocus
					/>

					{/* Кнопка очистки */}
					{selectedDate && (
						<div className="border-t p-3">
							<Button
								variant="ghost"
								className="w-full"
								onClick={() => handleSelect(undefined)}
							>
								Clear date
							</Button>
						</div>
					)}
				</PopoverContent>
			</Popover>

			{/* Ошибка валидации */}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
