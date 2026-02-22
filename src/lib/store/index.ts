import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { EntityType, EntityDataMap } from '../schemas'

// ============================================================================
// STATE INTERFACE (UNIVERSAL)
// ============================================================================

interface StoreState {
	// ========================================================================
	// УНИВЕРСАЛЬНАЯ СТРУКТУРА
	// ========================================================================
	// Все сущности хранятся здесь
	// entities.tasks = { id1: Task, id2: Task }
	// entities.projects = { id1: Project, id2: Project }
	// При добавлении новой таблицы в schemas.ts она автоматически появится здесь!
	entities: {
		[K in EntityType]?: Record<string, EntityDataMap[K]>
	}

	// Метаданные
	loading: Record<string, boolean> // Загружаются ли данные
	errors: Record<string, string | null> // Ошибки по entity

	// ========================================================================
	// ACTIONS
	// ========================================================================

	/**
	 * Установить все сущности определённого типа
	 * Используется при первичной загрузке
	 */
	setEntities: <E extends EntityType>(
		entity: E,
		data: EntityDataMap[E][]
	) => void

	/**
	 * Добавить/обновить одну сущность
	 * Используется при создании или optimistic update
	 */
	upsertEntity: <E extends EntityType>(
		entity: E,
		id: string,
		data: Partial<EntityDataMap[E]>
	) => void

	/**
	 * Удалить сущность
	 */
	deleteEntity: (entity: EntityType, id: string) => void

	/**
	 * Обновить поле сущности (основной метод для field handler)
	 */
	updateField: <E extends EntityType>(
		entity: E,
		id: string,
		field: keyof EntityDataMap[E],
		value: any
	) => void

	/**
	 * Применить обновление от real-time события
	 */
	applyRemoteUpdate: <E extends EntityType>(
		entity: E,
		id: string,
		patch: Partial<EntityDataMap[E]>
	) => void

	/**
	 * Установить состояние загрузки
	 */
	setLoading: (key: string, loading: boolean) => void

	/**
	 * Установить ошибку
	 */
	setError: (key: string, error: string | null) => void
}

// ============================================================================
// STORE (UNIVERSAL)
// ============================================================================

export const useStore = create<StoreState>()(
	devtools(
		(set) => ({
			// ========================================================================
			// INITIAL STATE
			// ========================================================================
			entities: {}, // Пустой объект, таблицы добавляются автоматически
			loading: {},
			errors: {},

			// ========================================================================
			// ACTIONS (UNIVERSAL)
			// ========================================================================

			/**
			 * Установить все сущности определённого типа
			 */
			setEntities: (entity, data) =>
				set((state) => ({
					entities: {
						...state.entities,
						[entity]: data.reduce(
							(acc, item) => {
								acc[(item as any).id] = item
								return acc
							},
							{} as Record<string, any>
						),
					},
				})),

			/**
			 * Добавить/обновить одну сущность
			 */
			upsertEntity: (entity, id, data) =>
				set((state) => {
					// Явно указываем тип для entityMap
					const entityMap = (state.entities[entity] || {}) as Record<string, any>
					const current = entityMap[id] || {}

					return {
						entities: {
							...state.entities,
							[entity]: {
								...entityMap,
								[id]: {
									...current,
									...data,
									updated_at: new Date().toISOString()
								},
							},
						},
					}
				}),

			/**
			 * Удалить сущность
			 */
			deleteEntity: (entity, id) =>
				set((state) => {
					// Явно указываем тип для entityMap
					const entityMap = state.entities[entity] as Record<string, any> | undefined
					if (!entityMap) return state

					const newEntityMap = { ...entityMap }
					delete newEntityMap[id]

					return {
						entities: {
							...state.entities,
							[entity]: newEntityMap,
						},
					}
				}),

			/**
			 * Обновить поле сущности
			 */
			updateField: (entity, id, field, value) =>
				set((state) => {
					// Явно указываем тип для entityMap
					const entityMap = state.entities[entity] as Record<string, any> | undefined
					if (!entityMap) return state

					const current = entityMap[id]
					if (!current) return state

					return {
						entities: {
							...state.entities,
							[entity]: {
								...entityMap,
								[id]: {
									...current,
									[field]: value,
									updated_at: new Date().toISOString(),
								},
							},
						},
					}
				}),

			/**
			 * Применить удалённое обновление (для real-time)
			 */
			applyRemoteUpdate: (entity, id, patch) =>
				set((state) => {
					// Явно указываем тип для entityMap
					const entityMap = (state.entities[entity] || {}) as Record<string, any>
					const current = entityMap[id]

					if (!current) {
						// Новая сущность от другого пользователя
						return {
							entities: {
								...state.entities,
								[entity]: {
									...entityMap,
									[id]: patch,
								},
							},
						}
					}

					return {
						entities: {
							...state.entities,
							[entity]: {
								...entityMap,
								[id]: { ...current, ...patch },
							},
						},
					}
				}),

			/**
			 * Установить состояние загрузки
			 */
			setLoading: (key, loading) =>
				set((state) => ({
					loading: { ...state.loading, [key]: loading },
				})),

			/**
			 * Установить ошибку
			 */
			setError: (key, error) =>
				set((state) => ({
					errors: { ...state.errors, [key]: error },
				})),
		})
	)
)

// ============================================================================
// SELECTORS (HELPERS)
// ============================================================================

/**
 * Получить одну сущность по ID
 */
export function selectEntity<E extends EntityType>(
	state: StoreState,
	entity: E,
	id: string
): EntityDataMap[E] | undefined {
	// Явно указываем тип возвращаемого значения
	return (state.entities[entity] as Record<string, EntityDataMap[E]> | undefined)?.[id]
}

/**
 * Получить все сущности определённого типа
 */
export function selectAllEntities<E extends EntityType>(
	state: StoreState,
	entity: E
): EntityDataMap[E][] {
	// Явно указываем тип для entityMap
	const entityMap = state.entities[entity] as Record<string, EntityDataMap[E]> | undefined
	if (!entityMap) return []

	return Object.values(entityMap)
}

/**
 * Получить состояние загрузки
 */
export function selectLoading(state: StoreState, key: string): boolean {
	return state.loading[key] || false
}

/**
 * Получить ошибку
 */
export function selectError(state: StoreState, key: string): string | null {
	return state.errors[key] || null
}