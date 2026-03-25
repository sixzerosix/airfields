"use client";

import { useCallback, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";
import { useStore } from "@/lib/store";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface ClearFieldsButtonProps<E extends EntityType> {
	/** Прямой callback (используй с useEntityDraft.clearFields) */
	onClear?: () => void;

	/** ИЛИ standalone: entity + entityId + fields */
	entity?: E;
	entityId?: string;
	fields?: (keyof EntityDataMap[E])[];
	defaultValues?: Partial<EntityDataMap[E]>;

	label?: string;
	showIcon?: boolean;
	variant?: ComponentProps<typeof Button>["variant"];
	size?: ComponentProps<typeof Button>["size"];
	className?: string;
	disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClearFieldsButton<E extends EntityType>({
	onClear,
	entity,
	entityId,
	fields,
	defaultValues = {},
	label = "Clear",
	showIcon = true,
	variant = "outline",
	size = "default",
	className,
	disabled,
}: ClearFieldsButtonProps<E>) {
	const handleClear = useCallback(() => {
		if (onClear) {
			onClear();
			return;
		}

		if (entity && entityId) {
			const store = useStore.getState();

			if (fields) {
				fields.forEach((field) => {
					const defaultVal = defaultValues[field] ?? "";
					store.updateField(entity, entityId, field, defaultVal);
				});
			} else {
				store.upsertEntity(entity, entityId, {
					id: entityId,
					...defaultValues,
				} as EntityDataMap[E]);
			}
		}
	}, [onClear, entity, entityId, fields, defaultValues]);

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			onClick={handleClear}
			className={className}
			disabled={disabled}
		>
			{showIcon && <Eraser className="w-4 h-4 mr-2" />}
			{label}
		</Button>
	);
}
