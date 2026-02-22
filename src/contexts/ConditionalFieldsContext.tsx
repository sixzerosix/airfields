import { createContext, useContext, useMemo, ReactNode } from "react";
import { useStore } from "@/lib/store";
import { getFieldConfig } from "@/lib/registry";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface ConditionalFieldsContextValue<E extends EntityType> {
	entity: E;
	entityId: string;

	// Все значения текущей сущности
	values: Partial<EntityDataMap[E]>;

	// Вычисленная видимость полей
	visibility: Record<string, boolean>;

	// Вычисленная обязательность полей
	required: Record<string, boolean>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ConditionalFieldsContext =
	createContext<ConditionalFieldsContextValue<any> | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface ConditionalFieldsProviderProps<E extends EntityType> {
	entity: E;
	entityId: string;
	children: ReactNode;
}

/**
 * ConditionalFieldsProvider
 *
 * Провайдер для conditional fields.
 * Подписывается на entity в Store один раз и вычисляет
 * visibility/required для всех полей внутри.
 *
 * @example
 * <ConditionalFieldsProvider entity="companies" entityId={id}>
 *   <EntityField name="company_type" />
 *   <EntityField name="inn" />  // Auto hide if company_type !== 'legal'
 * </ConditionalFieldsProvider>
 */
export function ConditionalFieldsProvider<E extends EntityType>({
	entity,
	entityId,
	children,
}: ConditionalFieldsProviderProps<E>) {
	// ========================================================================
	// SUBSCRIBE TO ENTITY (один раз на весь провайдер!)
	// ========================================================================

	const values = useStore((state) => {
		const entityMap = state.entities[entity];
		if (!entityMap) return {} as Partial<EntityDataMap[E]>;
		return (entityMap[entityId] || {}) as Partial<EntityDataMap[E]>;
	});

	// ========================================================================
	// COMPUTE VISIBILITY & REQUIRED
	// ========================================================================

	const { visibility, required } = useMemo(() => {
		const vis: Record<string, boolean> = {};
		const req: Record<string, boolean> = {};

		// Пройтись по всем полям и вычислить их состояние
		// NOTE: Мы не знаем все поля заранее, но это OK -
		// EntityField будет вызывать этот контекст и проверять

		// Для оптимизации можно было бы предвычислить все поля из registry,
		// но это усложнит код. Вместо этого делаем lazy evaluation в хуке.

		return { visibility: vis, required: req };
	}, [values, entity]);

	// ========================================================================
	// CONTEXT VALUE
	// ========================================================================

	const contextValue: ConditionalFieldsContextValue<E> = {
		entity,
		entityId,
		values,
		visibility,
		required,
	};

	return (
		<ConditionalFieldsContext.Provider value={contextValue}>
			{children}
		</ConditionalFieldsContext.Provider>
	);
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useConditionalFields
 *
 * Хук для доступа к conditional fields контексту.
 * Возвращает null если не внутри провайдера (fallback к обычному режиму).
 *
 * @example
 * const context = useConditionalFields()
 * const isVisible = context?.checkVisibility('inn') ?? true
 */
export function useConditionalFields<E extends EntityType = any>() {
	return useContext(
		ConditionalFieldsContext,
	) as ConditionalFieldsContextValue<E> | null;
}

// ============================================================================
// HELPER: CHECK VISIBILITY
// ============================================================================

/**
 * useFieldVisibility
 *
 * Хук для проверки видимости конкретного поля.
 * Работает как с провайдером, так и без него.
 *
 * @param entity - Тип сущности
 * @param entityId - ID сущности
 * @param fieldName - Имя поля
 * @returns true если поле видимо, false если скрыто
 */
export function useFieldVisibility(
	entity: EntityType,
	entityId: string,
	fieldName: string,
): boolean {
	const context = useConditionalFields();

	// Без контекста - всегда видимо (обычный режим)
	if (!context) return true;

	// Получить конфиг поля из registry
	const config = getFieldConfig(entity, fieldName);

	// Нет конфига или нет visibleWhen - всегда видимо
	if (!config?.visibleWhen) return true;

	// Вычислить видимость
	const { visibleWhen } = config;
	const dependentValue =
		context.values[visibleWhen.field as keyof typeof context.values];

	// Если есть equals - проверить равенство
	if (visibleWhen.equals !== undefined) {
		return dependentValue === visibleWhen.equals;
	}

	// Если есть condition - вызвать функцию
	if (visibleWhen.condition) {
		return visibleWhen.condition(dependentValue);
	}

	// По умолчанию видимо
	return true;
}

// ============================================================================
// HELPER: CHECK REQUIRED
// ============================================================================

/**
 * useFieldRequired
 *
 * Хук для проверки обязательности конкретного поля.
 *
 * @param entity - Тип сущности
 * @param entityId - ID сущности
 * @param fieldName - Имя поля
 * @returns true если поле обязательно, false если опциональное
 */
export function useFieldRequired(
	entity: EntityType,
	entityId: string,
	fieldName: string,
): boolean {
	const context = useConditionalFields();

	// Получить конфиг поля
	const config = getFieldConfig(entity, fieldName);

	// Базовая обязательность из конфига
	const baseRequired = config?.required ?? false;

	// Без контекста - возврат базовой обязательности
	if (!context) return baseRequired;

	// Нет requiredWhen - возврат базовой обязательности
	if (!config?.requiredWhen) return baseRequired;

	// Вычислить динамическую обязательность
	const { requiredWhen } = config;
	const dependentValue =
		context.values[requiredWhen.field as keyof typeof context.values];

	// Если есть equals - проверить равенство
	if (requiredWhen.equals !== undefined) {
		return dependentValue === requiredWhen.equals;
	}

	// Если есть condition - вызвать функцию
	if (requiredWhen.condition) {
		return requiredWhen.condition(dependentValue);
	}

	// По умолчанию базовая обязательность
	return baseRequired;
}
