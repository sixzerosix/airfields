"use client";

import React from "react";
import { EntityType, EntityDataMap } from "@/lib/schemas";
import { getFieldConfig } from "@/lib/registry";
import { EditableText } from "../fields/EditableText";
import { useStore, selectEntity } from "@/lib/store";
import { useIsDraft } from "@/contexts/DraftContext";

// ============================================================================
// TYPES
// ============================================================================

interface EntityFieldProps<E extends EntityType> {
	entity: E;
	entityId: string;
	name: keyof EntityDataMap[E];
	value?: any;
	customProps?: Record<string, any>;
	className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EntityField<E extends EntityType>({
	entity,
	entityId,
	name,
	value,
	customProps = {},
	className,
}: EntityFieldProps<E>) {
	// ========================================================================
	// ✅ STORE VALUE (реактивно)
	// ========================================================================

	const storeValue = useStore(
		(state) => selectEntity(state, entity, entityId)?.[name as string],
	);

	const currentValue = storeValue ?? value;

	// ========================================================================
	// ✅ DRAFT CONTEXT — автоматический saveMode="manual"
	// ========================================================================

	const isDraft = useIsDraft();

	// ========================================================================
	// REGISTRY CONFIG
	// ========================================================================

	const config = getFieldConfig(entity, String(name));

	// ========================================================================
	// FALLBACK
	// ========================================================================

	if (!config) {
		console.warn(
			`[EntityField] No config for ${entity}.${String(name)}, using EditableText`,
		);

		return (
			<div className={className}>
				<EditableText
					entity={entity}
					entityId={entityId}
					field={name}
					value={currentValue}
					label={String(name)}
					// ✅ isDraft → manual, иначе из customProps или default
					saveMode={isDraft ? "manual" : undefined}
					{...customProps}
				/>
			</div>
		);
	}

	// ========================================================================
	// RENDER
	// ========================================================================

	const {
		component: Component,
		label,
		placeholder,
		props: defaultProps = {},
		saveMode,
		debounceMs,
	} = config;

	const mergedProps = {
		entity,
		entityId,
		field: name,
		value: currentValue,
		label,
		placeholder,
		// ✅ isDraft принудительно ставит manual, иначе берём из config/customProps
		saveMode: isDraft ? "manual" : saveMode,
		debounceMs,
		...defaultProps,
		...customProps,
	};

	return (
		<div className={className}>
			<Component {...mergedProps} />
		</div>
	);
}

// ============================================================================
// EXAMPLES (для документации)
// ============================================================================

/**
 * ПРИМЕР 1: Простое использование
 *
 * <EntityField
 *   entity="tasks"
 *   entityId={taskId}
 *   name="title"
 *   value={task.title}
 * />
 *
 * Результат: Рендерит EditableText с конфигурацией из registry
 */

/**
 * ПРИМЕР 2: Кастомизация
 *
 * <EntityField
 *   entity="tasks"
 *   name="title"
 *   customProps={{
 *     className: "bg-yellow-50 border-2",
 *     saveMode: "manual",
 *     placeholder: "Custom placeholder"
 *   }}
 * />
 *
 * Результат: Переопределяет настройки из registry
 */

/**
 * ПРИМЕР 3: Несколько полей
 *
 * <div className="space-y-4">
 *   <EntityField entity="tasks" name="title" value={task.title} />
 *   <EntityField entity="tasks" name="description" value={task.description} />
 *   <EntityField entity="tasks" name="priority" value={task.priority} />
 * </div>
 *
 * Результат: Форма из 3 полей за 3 строки кода!
 */

/**
 * ПРИМЕР 4: Fallback для неизвестных полей
 *
 * <EntityField
 *   entity="tasks"
 *   name="some_new_field"  // ← нет в registry
 *   value={task.some_new_field}
 * />
 *
 * Результат: Автоматически рендерит EditableText
 */
