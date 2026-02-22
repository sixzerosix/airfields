"use client";

/**
 * REFERENCE PICKER
 *
 * Универсальный компонент для выбора связанной записи (foreign key)
 *
 * Примеры использования:
 * - tasks.project_id → projects
 * - comments.user_id → users
 * - tasks.assignee_id → users
 *
 * Особенности:
 * - Автоматическая загрузка опций
 * - Поиск и фильтрация
 * - Кастомное отображение
 * - Server Actions для сохранения
 */

import { useState, useEffect } from "react";
import { useEditableField } from "@/hooks/useEditableField";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface ReferencePickerProps<
	E extends EntityType,
	RefEntity extends EntityType,
> {
	// Основные props
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value?: string | null;

	// Настройки связи
	referenceTable: RefEntity;
	displayField: keyof EntityDataMap[RefEntity];

	// Дополнительные поля для отображения
	secondaryField?: keyof EntityDataMap[RefEntity];

	// UI
	label?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;

	// Фильтрация опций
	filter?: (item: EntityDataMap[RefEntity]) => boolean;

	// Сортировка
	orderBy?: {
		field: keyof EntityDataMap[RefEntity];
		ascending?: boolean;
	};

	// Разрешить пустое значение
	allowNull?: boolean;
	nullLabel?: string;

	// Save mode
	saveMode?: "auto" | "manual" | "hybrid";
	showSaveButton?: boolean;

	// Callbacks
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReferencePicker<
	E extends EntityType,
	RefEntity extends EntityType,
>({
	entity,
	entityId,
	field,
	value,
	referenceTable,
	displayField,
	secondaryField,
	label,
	placeholder = "Select...",
	className,
	disabled = false,
	filter,
	orderBy,
	allowNull = true,
	nullLabel = "None",
	saveMode = "auto",
	showSaveButton = false,
	onSuccess,
	onError,
}: ReferencePickerProps<E, RefEntity>) {
	// ========================================================================
	// STATE
	// ========================================================================

	const [options, setOptions] = useState<EntityDataMap[RefEntity][]>([]);
	const [isLoadingOptions, setIsLoadingOptions] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");

	// ========================================================================
	// EDITABLE FIELD HOOK
	// ========================================================================

	const {
		localValue,
		hasUnsavedChanges,
		isSaving,
		handleChange,
		save,
		cancel,
	} = useEditableField({
		entity,
		entityId,
		field,
		value: value || null,
		saveMode,
		onSuccess,
		onError,
	});

	// ========================================================================
	// ЗАГРУЗКА ОПЦИЙ
	// ========================================================================

	useEffect(() => {
		async function loadOptions() {
			setIsLoadingOptions(true);

			try {
				const supabase = getSupabaseClient();

				let query = supabase.from(referenceTable).select("*");

				// Сортировка
				if (orderBy) {
					query = query.order(String(orderBy.field), {
						ascending: orderBy.ascending ?? true,
					});
				}

				const { data, error } = await query;

				if (error) {
					console.error(
						"[ReferencePicker] Error loading options:",
						error,
					);
					onError?.(error.message);
					return;
				}

				if (data) {
					const typedData =
						data as unknown as EntityDataMap[RefEntity][];
					// Применить фильтр если есть
					const filtered = filter
						? typedData.filter(filter)
						: typedData;
					setOptions(filtered as EntityDataMap[RefEntity][]);
				}
			} catch (err) {
				console.error("[ReferencePicker] Error:", err);
			} finally {
				setIsLoadingOptions(false);
			}
		}

		loadOptions();
	}, [referenceTable, filter, orderBy, onError]);

	// ========================================================================
	// ФИЛЬТРАЦИЯ ПО ПОИСКУ
	// ========================================================================

	const filteredOptions = options.filter((option) => {
		if (!searchTerm) return true;

		const displayValue = String(option[displayField] || "");
		const secondaryValue = secondaryField
			? String(option[secondaryField] || "")
			: "";

		const search = searchTerm.toLowerCase();
		return (
			displayValue.toLowerCase().includes(search) ||
			secondaryValue.toLowerCase().includes(search)
		);
	});

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<Label htmlFor={`${entity}-${entityId}-${String(field)}`}>
					{label}
				</Label>
			)}

			<div className="flex gap-2">
				<Select
					value={localValue || "null"}
					onValueChange={(val) => {
						const newValue = val === "null" ? null : val;
						handleChange(newValue);
					}}
					disabled={disabled || isLoadingOptions}
				>
					<SelectTrigger
						id={`${entity}-${entityId}-${String(field)}`}
						className={cn(
							"flex-1",
							hasUnsavedChanges && "border-yellow-500",
						)}
					>
						<SelectValue placeholder={placeholder}>
							{isLoadingOptions ? (
								<div className="flex items-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>Loading...</span>
								</div>
							) : localValue ? (
								(() => {
									const selected = options.find(
										(opt) => (opt as any).id === localValue,
									);
									if (!selected) return placeholder;

									const display = String(
										selected[displayField] || "",
									);
									const secondary = secondaryField
										? String(selected[secondaryField] || "")
										: null;

									return (
										<div className="flex items-center gap-2">
											<span>{display}</span>
											{secondary && (
												<span className="text-xs text-muted-foreground">
													({secondary})
												</span>
											)}
										</div>
									);
								})()
							) : (
								placeholder
							)}
						</SelectValue>
					</SelectTrigger>

					<SelectContent>
						{/* Поиск */}
						{options.length > 5 && (
							<div className="p-2 border-b">
								<div className="relative">
									<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
									<input
										type="text"
										placeholder="Search..."
										value={searchTerm}
										onChange={(e) =>
											setSearchTerm(e.target.value)
										}
										className="w-full pl-8 pr-2 py-2 text-sm border rounded-md"
										onClick={(e) => e.stopPropagation()}
									/>
								</div>
							</div>
						)}

						{/* Null опция */}
						{allowNull && (
							<SelectItem value="null">
								<span className="text-muted-foreground italic">
									{nullLabel}
								</span>
							</SelectItem>
						)}

						{/* Опции */}
						{filteredOptions.map((option) => {
							const id = (option as any).id;
							const display = String(option[displayField] || "");
							const secondary = secondaryField
								? String(option[secondaryField] || "")
								: null;

							return (
								<SelectItem key={id} value={id}>
									<div className="flex items-center gap-2">
										<span>{display}</span>
										{secondary && (
											<span className="text-xs text-muted-foreground">
												({secondary})
											</span>
										)}
									</div>
								</SelectItem>
							);
						})}

						{/* Нет результатов */}
						{filteredOptions.length === 0 && (
							<div className="p-4 text-center text-sm text-muted-foreground">
								No results found
							</div>
						)}
					</SelectContent>
				</Select>

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
		</div>
	);
}

// ============================================================================
// EXAMPLES
// ============================================================================

/**
 * ПРИМЕР 1: Задача → Проект
 *
 * <ReferencePicker
 *   entity="tasks"
 *   entityId={taskId}
 *   field="project_id"
 *   value={task.project_id}
 *   referenceTable="projects"
 *   displayField="name"
 *   label="Project"
 * />
 */

/**
 * ПРИМЕР 2: Комментарий → Пользователь (с поиском)
 *
 * <ReferencePicker
 *   entity="comments"
 *   entityId={commentId}
 *   field="user_id"
 *   value={comment.user_id}
 *   referenceTable="users"
 *   displayField="name"
 *   secondaryField="email"
 *   label="Author"
 *   placeholder="Select author..."
 *   allowNull={false}
 * />
 */

/**
 * ПРИМЕР 3: С фильтрацией
 *
 * <ReferencePicker
 *   entity="tasks"
 *   entityId={taskId}
 *   field="assignee_id"
 *   value={task.assignee_id}
 *   referenceTable="users"
 *   displayField="name"
 *   label="Assignee"
 *   filter={(user) => user.role === 'member'}
 *   orderBy={{ field: 'name', ascending: true }}
 * />
 */
