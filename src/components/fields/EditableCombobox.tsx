"use client";

/**
 * EditableCombobox — single select с поиском и auto-save
 *
 * Для M21 связей (category_id → categories).
 * Опции загружаются с сервера или передаются через props.
 * Поддерживает вложенность (показывает parent → child).
 *
 * USAGE через EntityField registry:
 * ```tsx
 * <EntityField entity="notes" entityId={id} name="category_id" />
 * ```
 *
 * Или напрямую:
 * ```tsx
 * <EditableCombobox
 *   entity="notes"
 *   entityId={noteId}
 *   field="category_id"
 *   value={note.category_id}
 *   referenceTable="categories"
 *   displayField="name"
 *   filter={{ entity_type: "notes" }}
 *   label="Category"
 *   allowNull
 * />
 * ```
 */

import { useState, useEffect, useMemo } from "react";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { useEditableField } from "@/hooks/useEditableField";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ComboboxOption {
	id: string;
	label: string;
	parentLabel?: string;
	color?: string;
}

interface EditableComboboxProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value?: string | null;

	/** Таблица откуда грузить опции */
	referenceTable: string;

	/** Поле для отображения */
	displayField: string;

	/** Поле parent для вложенности (опционально) */
	parentField?: string;

	/** Фильтр при загрузке (например { entity_type: "notes" }) */
	filter?: Record<string, string>;

	/** Сортировка */
	orderBy?: string;

	/** Или передать опции напрямую (вместо referenceTable) */
	options?: ComboboxOption[];

	// UI
	label?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;

	/** Разрешить пустое значение @default true */
	allowNull?: boolean;

	/** Текст для пустого значения */
	nullLabel?: string;

	// Save
	saveMode?: "auto" | "manual";
	debounceMs?: number;

	// Callbacks
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditableCombobox<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	referenceTable,
	displayField,
	parentField,
	filter,
	orderBy,
	options: propOptions,
	label,
	placeholder = "Select...",
	className,
	disabled = false,
	allowNull = true,
	nullLabel = "None",
	saveMode,
	debounceMs = 0,
	onSuccess,
	onError,
}: EditableComboboxProps<E>) {
	// ==========================================================================
	// EDITABLE FIELD (auto-save)
	// ==========================================================================

	const {
		localValue,
		error: fieldError,
		handleChange,
	} = useEditableField({
		entity,
		entityId,
		field,
		value: value || null,
		debounceMs,
		saveMode,
		onSuccess,
		onError,
	});

	// ==========================================================================
	// LOAD OPTIONS
	// ==========================================================================

	const [loadedOptions, setLoadedOptions] = useState<ComboboxOption[]>([]);
	const [isLoading, setIsLoading] = useState(!propOptions);

	useEffect(() => {
		if (propOptions) return; // Опции переданы через props

		loadOptions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [referenceTable, filter?.entity_type]);

	const loadOptions = async () => {
		setIsLoading(true);
		try {
			const supabase = getSupabaseClient();

			let query = supabase
				.from(referenceTable)
				.select("*")
				.order(orderBy || displayField);

			// Применить фильтры
			if (filter) {
				for (const [key, val] of Object.entries(filter)) {
					query = query.eq(key, val);
				}
			}

			const { data, error } = await query;
			if (error) throw error;

			// Построить опции с parent labels для вложенности
			const items = (data || []) as Record<string, any>[];

			const options: ComboboxOption[] = items.map((item) => {
				let parentLabel: string | undefined;

				if (parentField && item[parentField]) {
					const parent = items.find(
						(p) => p.id === item[parentField],
					);
					parentLabel = parent?.[displayField];
				}

				return {
					id: item.id,
					label: item[displayField],
					parentLabel,
					color: item.color,
				};
			});

			setLoadedOptions(options);
		} catch (err: any) {
			console.error("[EditableCombobox] Load error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	// ==========================================================================
	// OPTIONS
	// ==========================================================================

	const options = propOptions || loadedOptions;

	// Combobox items — строковые значения для Combobox
	const comboboxItems = useMemo(() => {
		const items: string[] = [];
		if (allowNull) items.push(nullLabel);
		items.push(...options.map((o) => o.label));
		return items;
	}, [options, allowNull, nullLabel]);

	// Текущее выбранное значение → label
	const selectedOption = options.find((o) => o.id === localValue);
	const selectedLabel = selectedOption?.label || (allowNull ? nullLabel : "");

	// ==========================================================================
	// HANDLE CHANGE
	// ==========================================================================

	const handleSelect = (label: string) => {
		if (label === nullLabel) {
			handleChange(null);
			return;
		}

		const option = options.find((o) => o.label === label);
		if (option) {
			handleChange(option.id);
		}
	};

	// ==========================================================================
	// RENDER
	// ==========================================================================

	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<Label htmlFor={`${entity}-${entityId}-${String(field)}`}>
					{label}
				</Label>
			)}

			<Combobox
				items={comboboxItems}
				value={selectedLabel}
				onValueChange={handleSelect}
				disabled={disabled || isLoading}
				itemToStringValue={(item) => item}
			>
				<ComboboxInput
					id={`${entity}-${entityId}-${String(field)}`}
					placeholder={isLoading ? "Loading..." : placeholder}
					data-entity={entity}
					data-entity-id={entityId}
					data-field={String(field)}
				/>

				<ComboboxContent>
					<ComboboxEmpty>No items found</ComboboxEmpty>
					<ComboboxList>
						{(item: string) => {
							const option = options.find(
								(o) => o.label === item,
							);
							const isNull = item === nullLabel;

							return (
								<ComboboxItem key={item} value={item}>
									<div className="flex items-center gap-2">
										{option?.color && (
											<div
												className="w-2.5 h-2.5 rounded-full flex-shrink-0"
												style={{
													backgroundColor:
														option.color,
												}}
											/>
										)}
										<div>
											{isNull ? (
												<span className="text-muted-foreground italic">
													{nullLabel}
												</span>
											) : (
												<>
													{option?.parentLabel && (
														<span className="text-xs text-muted-foreground mr-1">
															{option.parentLabel}{" "}
															/
														</span>
													)}
													<span>{item}</span>
												</>
											)}
										</div>
									</div>
								</ComboboxItem>
							);
						}}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>

			{fieldError && (
				<p className="text-sm text-destructive">{fieldError}</p>
			)}
		</div>
	);
}
