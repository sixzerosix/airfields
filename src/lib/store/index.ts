import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { EntityType, EntityDataMap } from '../schemas'

// ============================================================================
// STATE INTERFACE (UNIVERSAL)
// ============================================================================

interface StoreState {
	entities: {
		[K in EntityType]?: Record<string, EntityDataMap[K]>
	}

	/**
	 * ✅ ID черновиков — НЕ показываются в selectAllEntities (списках).
	 * Добавляются через markAsDraft, убираются через unmarkDraft.
	 * EntityField читает drafts нормально через selectEntity (по конкретному id).
	 */
	draftIds: Set<string>

	loading: Record<string, boolean>
	errors: Record<string, string | null>

	// ACTIONS
	setEntities: <E extends EntityType>(entity: E, data: EntityDataMap[E][]) => void
	upsertEntity: <E extends EntityType>(entity: E, id: string, data: Partial<EntityDataMap[E]>) => void
	deleteEntity: (entity: EntityType, id: string) => void
	updateField: <E extends EntityType>(entity: E, id: string, field: keyof EntityDataMap[E], value: any) => void
	applyRemoteUpdate: <E extends EntityType>(entity: E, id: string, patch: Partial<EntityDataMap[E]>) => void
	setLoading: (key: string, loading: boolean) => void
	setError: (key: string, error: string | null) => void

	/** Пометить ID как draft (не показывать в списках) */
	markAsDraft: (id: string) => void

	/** Убрать пометку draft (после успешного create — показывать в списках) */
	unmarkDraft: (id: string) => void
}

// ============================================================================
// STORE (UNIVERSAL)
// ============================================================================

export const useStore = create<StoreState>()(
	devtools(
		(set) => ({
			entities: {},
			draftIds: new Set<string>(),
			loading: {},
			errors: {},

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

			upsertEntity: (entity, id, data) =>
				set((state) => {
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

			deleteEntity: (entity, id) =>
				set((state) => {
					const entityMap = state.entities[entity] as Record<string, any> | undefined
					if (!entityMap) return state

					const newEntityMap = { ...entityMap }
					delete newEntityMap[id]

					// ✅ Убираем из draftIds тоже
					const newDraftIds = new Set(state.draftIds)
					newDraftIds.delete(id)

					return {
						entities: {
							...state.entities,
							[entity]: newEntityMap,
						},
						draftIds: newDraftIds,
					}
				}),

			updateField: (entity, id, field, value) =>
				set((state) => {
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

			applyRemoteUpdate: (entity, id, patch) =>
				set((state) => {
					const entityMap = (state.entities[entity] || {}) as Record<string, any>
					const current = entityMap[id]

					if (!current) {
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

			setLoading: (key, loading) =>
				set((state) => ({
					loading: { ...state.loading, [key]: loading },
				})),

			setError: (key, error) =>
				set((state) => ({
					errors: { ...state.errors, [key]: error },
				})),

			// ✅ Draft management
			markAsDraft: (id) =>
				set((state) => {
					const newDraftIds = new Set(state.draftIds)
					newDraftIds.add(id)
					return { draftIds: newDraftIds }
				}),

			unmarkDraft: (id) =>
				set((state) => {
					const newDraftIds = new Set(state.draftIds)
					newDraftIds.delete(id)
					return { draftIds: newDraftIds }
				}),
		})
	)
)

// ============================================================================
// SELECTORS
// ============================================================================

export function selectEntity<E extends EntityType>(
	state: StoreState,
	entity: E,
	id: string
): EntityDataMap[E] | undefined {
	return (state.entities[entity] as Record<string, EntityDataMap[E]> | undefined)?.[id]
}

/**
 * ✅ Фильтрует draft записи — они не появляются в списках
 */
export function selectAllEntities<E extends EntityType>(
	state: StoreState,
	entity: E
): EntityDataMap[E][] {
	const entityMap = state.entities[entity] as Record<string, EntityDataMap[E]> | undefined
	if (!entityMap) return []

	return Object.entries(entityMap)
		.filter(([id]) => !state.draftIds.has(id))
		.map(([, value]) => value)
}

export function selectLoading(state: StoreState, key: string): boolean {
	return state.loading[key] || false
}

export function selectError(state: StoreState, key: string): string | null {
	return state.errors[key] || null
}