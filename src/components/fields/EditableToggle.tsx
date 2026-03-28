"use client";

/**
 * EditableToggle — boolean поле с Toggle кнопкой
 *
 * Универсальный: иконка, label, размер — всё настраивается.
 * Auto-save через useEditableField.
 *
 * USAGE через EntityField:
 * ```tsx
 * <EntityField entity="notes" entityId={id} name="is_favorite" />
 * ```
 *
 * Или напрямую:
 * ```tsx
 * <EditableToggle
 *   entity="notes"
 *   entityId={id}
 *   field="is_favorite"
 *   value={false}
 *   icon={<BookmarkIcon />}
 *   activeIcon={<BookmarkIcon className="fill-current" />}
 *   label="Bookmark"
 * />
 * ```
 */

import { type ReactNode } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { useEditableField } from "@/hooks/useEditableField";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EditableToggleProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value: boolean | undefined | null;

	/** Иконка (неактивное состояние) */
	icon?: ReactNode;

	/** Иконка (активное состояние). Если не указана — используется icon */
	activeIcon?: ReactNode;

	/** Текст рядом с toggle */
	label?: string;

	/** Показывать label сверху (как у других полей) @default false */
	fieldLabel?: string;

	/** Размер toggle @default "sm" */
	size?: "sm" | "default" | "lg";

	/** Вариант @default "outline" */
	variant?: "default" | "outline";

	/** Дополнительные CSS классы для toggle */
	className?: string;

	/** CSS классы для обёртки */
	wrapperClassName?: string;

	disabled?: boolean;
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditableToggle<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	icon,
	activeIcon,
	label,
	fieldLabel,
	size = "sm",
	variant = "outline",
	className,
	wrapperClassName,
	disabled = false,
	onSuccess,
	onError,
}: EditableToggleProps<E>) {
	const { localValue, error, handleChange } = useEditableField({
		entity,
		entityId,
		field,
		value: value ?? false,
		debounceMs: 0, // Toggle сохраняется мгновенно
		onSuccess,
		onError,
	});

	const isPressed = Boolean(localValue);

	const handleToggle = (pressed: boolean) => {
		handleChange(pressed);
	};

	// Выбрать иконку
	const currentIcon = isPressed && activeIcon ? activeIcon : icon;

	return (
		<div className={cn("space-y-2", wrapperClassName)}>
			{fieldLabel && <Label>{fieldLabel}</Label>}

			<Toggle
				pressed={isPressed}
				onPressedChange={handleToggle}
				size={size}
				variant={variant}
				disabled={disabled}
				aria-label={label || fieldLabel || String(field)}
				data-entity={entity}
				data-entity-id={entityId}
				data-field={String(field)}
				className={cn("group/toggle", className)}
			>
				{currentIcon}
				{label && <span>{label}</span>}
			</Toggle>

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
