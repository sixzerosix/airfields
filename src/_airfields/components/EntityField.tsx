"use client";

import React from "react";
import { EntityType, EntityDataMap } from "@/lib/schemas";
import { getFieldConfig } from "@/lib/registry";
import { EditableText } from "./fields/EditableText";

// ============================================================================
// TYPES
// ============================================================================

interface EntityFieldProps<E extends EntityType> {
	/**
	 * Тип сущности (tasks, projects, etc)
	 */
	entity: E;

	/**
	 * ID сущности
	 */
	entityId: string;

	/**
	 * Имя поля
	 */
	name: keyof EntityDataMap[E];

	/**
	 * Текущее значение поля
	 */
	value?: any;

	/**
	 * Кастомные props (переопределяют конфиг из registry)
	 * Это позволяет гибко настраивать поля
	 */
	customProps?: Record<string, any>;

	/**
	 * Класс для обертки
	 */
	className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EntityField - умный компонент который автоматически рендерит поле
 * на основе конфигурации из Entity Registry
 *
 * РЕЖИМЫ ИСПОЛЬЗОВАНИЯ:
 *
 * 1. AUTO MODE (из registry):
 *    <EntityField entity="tasks" entityId={id} name="title" value={task.title} />
 *
 * 2. CUSTOM MODE (переопределение):
 *    <EntityField
 *      entity="tasks"
 *      name="title"
 *      customProps={{ className: "bg-yellow-50", saveMode: "manual" }}
 *    />
 *
 * 3. FALLBACK (если нет в registry):
 *    Автоматически рендерит EditableText
 */
export function EntityField<E extends EntityType>({
	entity,
	entityId,
	name,
	value,
	customProps = {},
	className,
}: EntityFieldProps<E>) {
	// ========================================================================
	// ПОЛУЧИТЬ КОНФИГУРАЦИЮ ИЗ REGISTRY
	// ========================================================================

	const config = getFieldConfig(entity, String(name));

	// ========================================================================
	// FALLBACK: Если нет конфигурации - используем EditableText по умолчанию
	// ========================================================================

	if (!config) {
		console.warn(
			`[EntityField] No config found for ${entity}.${String(name)}, using EditableText as fallback`,
		);

		return (
			<div className={className}>
				<EditableText
					entity={entity}
					entityId={entityId}
					field={name}
					value={value}
					label={String(name)}
					{...customProps}
				/>
			</div>
		);
	}

	// ========================================================================
	// RENDER: Используем компонент из конфигурации
	// ========================================================================

	const {
		component: Component,
		label,
		placeholder,
		props: defaultProps = {},
		saveMode,
		debounceMs,
	} = config;

	// Объединяем props: registry + custom (custom приоритетнее!)
	const mergedProps = {
		entity,
		entityId,
		field: name,
		value,
		label,
		placeholder,
		saveMode,
		debounceMs,
		...defaultProps,
		...customProps, // ← customProps переопределяют всё!
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
