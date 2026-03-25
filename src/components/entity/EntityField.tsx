"use client";

import { EntityType, EntityDataMap } from "@/lib/schemas";
import { getFieldConfig } from "@/lib/registry";
import { EditableText } from "../fields/EditableText";
import { useStore, selectEntity } from "@/lib/store";

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
	 * Текущее значение поля (опционально!)
	 * Если не передано — берётся из Store автоматически.
	 * Если передано — используется только как fallback,
	 * Store-значение всегда приоритетнее.
	 */
	value?: any;

	/**
	 * Кастомные props (переопределяют конфиг из registry)
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

export function EntityField<E extends EntityType>({
	entity,
	entityId,
	name,
	value,
	customProps = {},
	className,
}: EntityFieldProps<E>) {
	// ========================================================================
	// ✅ ЧИТАЕМ VALUE ИЗ STORE (реактивно!)
	// ========================================================================
	//
	// Это ключевой фикс. Раньше value приходил только через prop,
	// и если prop был "запечатан" из Server Component — UI не обновлялся.
	//
	// Теперь EntityField сам подписывается на Store через useStore.
	// При любом изменении в Store — компонент ре-рендерится.
	//
	// Приоритет: Store value > prop value > undefined
	// ========================================================================

	const storeValue = useStore(
		(state) =>
			(selectEntity(state, entity, entityId) as Record<string, any>)?.[
				name as string
			],
	);

	// Store всегда приоритетнее — там актуальные данные
	// prop value используется только как начальный fallback
	const currentValue = storeValue ?? value;

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
			<EditableText
				entity={entity}
				entityId={entityId}
				field={name}
				value={currentValue}
				label={String(name)}
				className={className}
				{...customProps}
			/>
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

	const mergedProps = {
		entity,
		entityId,
		field: name,
		value: currentValue, // ← Store value, не prop!
		label,
		placeholder,
		saveMode,
		debounceMs,
		className,
		...defaultProps,
		...customProps,
	};

	return <Component {...mergedProps} />;
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
