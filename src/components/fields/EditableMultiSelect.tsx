"use client";

/**
 * EDITABLE MULTI SELECT
 *
 * Компонент для выбора нескольких значений (many-to-many)
 *
 * Примеры использования:
 * - tasks.tags[] → tags (many-to-many через task_tags)
 * - users.roles[] → roles
 * - posts.categories[] → categories
 *
 * Хранение данных:
 * - JSONB array в PostgreSQL: tags: ['tag1', 'tag2']
 * - Junction table: task_tags (task_id, tag_id)
 */

import { useState } from "react";
import { useEditableField } from "@/hooks/useEditableField";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

// ============================================================================
// TYPES
// ============================================================================

export interface MultiSelectOption {
	value: string;
	label: string;
	description?: string;
	color?: string;
}

interface EditableMultiSelectProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value?: string[] | null;

	// Опции
	options: MultiSelectOption[];

	// UI
	label?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;

	// Лимиты
	maxSelections?: number;

	// Создание новых опций
	allowCreate?: boolean;
	onCreateOption?: (value: string) => Promise<void>;

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

export function EditableMultiSelect<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	options,
	label,
	placeholder = "Select items...",
	className,
	disabled = false,
	maxSelections,
	allowCreate = false,
	onCreateOption,
	saveMode = "auto",
	showSaveButton = false,
	onSuccess,
	onError,
}: EditableMultiSelectProps<E>) {
	// ========================================================================
	// STATE
	// ========================================================================

	const [open, setOpen] = useState(false);
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
		value: value || [],
		saveMode,
		onSuccess,
		onError,
	});

	const selectedValues = (localValue as string[]) || [];

	// ========================================================================
	// HANDLERS
	// ========================================================================

	const handleSelect = (optionValue: string) => {
		const newValues = selectedValues.includes(optionValue)
			? selectedValues.filter((v) => v !== optionValue)
			: [...selectedValues, optionValue];

		// Проверить лимит
		if (maxSelections && newValues.length > maxSelections) {
			onError?.(`Maximum ${maxSelections} selections allowed`);
			return;
		}

		handleChange(newValues);
	};

	const handleRemove = (optionValue: string) => {
		const newValues = selectedValues.filter((v) => v !== optionValue);
		handleChange(newValues);
	};

	const handleCreate = async () => {
		if (!searchTerm.trim() || !allowCreate || !onCreateOption) return;

		try {
			await onCreateOption(searchTerm.trim());
			setSearchTerm("");
			setOpen(false);
		} catch (err) {
			onError?.(
				err instanceof Error ? err.message : "Failed to create option",
			);
		}
	};

	// ========================================================================
	// FILTERED OPTIONS
	// ========================================================================

	const filteredOptions = options.filter((option) => {
		const matchesSearch = option.label
			.toLowerCase()
			.includes(searchTerm.toLowerCase());

		return matchesSearch;
	});

	const selectedOptions = options.filter((opt) =>
		selectedValues.includes(opt.value),
	);

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<Label htmlFor={`${entity}-${entityId}-${String(field)}`}>
					{label}
					{maxSelections && (
						<span className="text-xs text-muted-foreground ml-2">
							({selectedValues.length}/{maxSelections})
						</span>
					)}
				</Label>
			)}

			<div className="space-y-2">
				{/* ============================================================== */}
				{/* SELECTED ITEMS (Badges)                                       */}
				{/* ============================================================== */}

				{selectedOptions.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{selectedOptions.map((option) => (
							<Badge
								key={option.value}
								variant="secondary"
								className={cn(
									"pl-3 pr-1",
									option.color &&
										`bg-${option.color}-100 text-${option.color}-900`,
								)}
							>
								{option.label}
								<button
									type="button"
									onClick={() => handleRemove(option.value)}
									disabled={disabled}
									className="ml-2 rounded-full p-0.5 hover:bg-muted-foreground/20"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				)}

				{/* ============================================================== */}
				{/* POPOVER WITH OPTIONS                                          */}
				{/* ============================================================== */}

				<div className="flex gap-2">
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								aria-expanded={open}
								disabled={disabled}
								className={cn(
									"flex-1 justify-start",
									hasUnsavedChanges && "border-yellow-500",
								)}
							>
								<Plus className="mr-2 h-4 w-4" />
								{placeholder}
							</Button>
						</PopoverTrigger>

						<PopoverContent className="w-[400px] p-0">
							<Command>
								<CommandInput
									placeholder="Search or create..."
									value={searchTerm}
									onValueChange={setSearchTerm}
								/>

								<CommandEmpty>
									{allowCreate && searchTerm.trim() ? (
										<div className="p-2">
											<Button
												variant="ghost"
												className="w-full justify-start"
												onClick={handleCreate}
											>
												<Plus className="mr-2 h-4 w-4" />
												Create "{searchTerm}"
											</Button>
										</div>
									) : (
										<div className="p-4 text-sm text-center text-muted-foreground">
											No options found
										</div>
									)}
								</CommandEmpty>

								<CommandGroup>
									{filteredOptions.map((option) => {
										const isSelected =
											selectedValues.includes(
												option.value,
											);

										return (
											<CommandItem
												key={option.value}
												value={option.value}
												onSelect={() =>
													handleSelect(option.value)
												}
											>
												<div className="flex items-center gap-2 flex-1">
													<div
														className={cn(
															"h-4 w-4 border rounded",
															isSelected &&
																"bg-primary border-primary",
														)}
													>
														{isSelected && (
															<svg
																className="h-4 w-4 text-primary-foreground"
																fill="none"
																viewBox="0 0 24 24"
																stroke="currentColor"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={
																		2
																	}
																	d="M5 13l4 4L19 7"
																/>
															</svg>
														)}
													</div>

													<div className="flex-1">
														<div className="font-medium">
															{option.label}
														</div>
														{option.description && (
															<div className="text-xs text-muted-foreground">
																{
																	option.description
																}
															</div>
														)}
													</div>
												</div>
											</CommandItem>
										);
									})}
								</CommandGroup>
							</Command>
						</PopoverContent>
					</Popover>

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
		</div>
	);
}

// ============================================================================
// EXAMPLES
// ============================================================================

/**
 * ПРИМЕР 1: Теги задачи (JSONB array)
 *
 * <EditableMultiSelect
 *   entity="tasks"
 *   entityId={taskId}
 *   field="tags"
 *   value={task.tags}
 *   options={TAG_OPTIONS}
 *   label="Tags"
 *   placeholder="Add tags..."
 *   allowCreate={true}
 *   onCreateOption={async (tag) => {
 *     // Создать новый тег
 *   }}
 * />
 */

/**
 * ПРИМЕР 2: Роли пользователя (с лимитом)
 *
 * <EditableMultiSelect
 *   entity="users"
 *   entityId={userId}
 *   field="roles"
 *   value={user.roles}
 *   options={ROLE_OPTIONS}
 *   label="Roles"
 *   maxSelections={3}
 * />
 */
