import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore, selectAllEntities } from "@/lib/store";
import { subscribeToEntity } from "@/lib/supabase/realtime";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

/**
 * useEntityList - универсальный хук для работы со списками
 *
 * Управляет:
 * - Инициализацией Store
 * - Real-time подписками
 * - Получением актуальных данных
 *
 * Это ОСНОВА. EntityList компонент — просто обёртка над этим хуком.
 *
 * @example
 * ```tsx
 * // Полная свобода в рендере:
 * const notes = useEntityList("notes", initialNotes);
 *
 * return (
 *   <table>
 *     {notes.map(n => <tr key={n.id}><td>{n.title}</td></tr>)}
 *   </table>
 * );
 * ```
 */
export function useEntityList<E extends EntityType>(
	entity: E,
	initialData: EntityDataMap[E][],
	options?: {
		enableRealtime?: boolean;
		filter?: { column: string; value: string };
	},
): EntityDataMap[E][] {
	const { enableRealtime = true, filter } = options || {};

	// ==========================================================================
	// STORE INITIALIZATION (один раз)
	// ==========================================================================

	const initialized = useRef(false);

	useEffect(() => {
		// Защита от повторной инициализации при изменении ссылки на массив
		if (initialized.current) return;
		initialized.current = true;

		const store = useStore.getState();
		initialData.forEach((item) => {
			const id = (item as any).id;
			if (id) {
				store.upsertEntity(entity, id, item);
			}
		});
	}, [entity]); // ← только entity, НЕ initialData (ссылка меняется каждый рендер)

	// ==========================================================================
	// REAL-TIME SUBSCRIPTION
	// ==========================================================================

	useEffect(() => {
		if (!enableRealtime) return;

		const unsubscribe = filter
			? subscribeToEntity(entity, filter)
			: subscribeToEntity(entity);

		return () => unsubscribe();
	}, [entity, enableRealtime, filter?.column, filter?.value]);

	// ==========================================================================
	// GET FROM STORE (реактивно)
	// ==========================================================================

	const items = useStore(
		useShallow((state) => selectAllEntities(state, entity)),
	);

	return items;
}