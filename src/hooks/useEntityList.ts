import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore, selectAllEntities } from "@/lib/store";
import { subscribeToEntity } from "@/lib/supabase/realtime";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface UseEntityListOptions {
	enableRealtime?: boolean;
	filter?: { column: string; value: string };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useEntityList — синхронизация Store + Realtime
 *
 * ТОЛЬКО управляет данными (Store init + realtime).
 * НЕ сортирует и НЕ фильтрует — это делает useEntityFilters.applyTo().
 *
 * @example
 * ```tsx
 * const items = useEntityList("notes", initialNotes);
 * const filtered = filters.applyTo(items); // ← сортировка и фильтры тут
 * ```
 */
export function useEntityList<E extends EntityType>(
	entity: E,
	initialData: EntityDataMap[E][],
	options?: UseEntityListOptions,
): EntityDataMap[E][] {
	const { enableRealtime = true, filter } = options || {};

	// ==========================================================================
	// STORE INITIALIZATION
	// ==========================================================================

	const initialized = useRef(false);

	useEffect(() => {
		if (initialized.current) return;
		initialized.current = true;

		const store = useStore.getState();
		initialData.forEach((item) => {
			const id = (item as any).id;
			if (id) {
				store.upsertEntity(entity, id, item);
			}
		});
	}, [entity]);

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
	// GET FROM STORE
	// ==========================================================================

	const items = useStore(
		useShallow((state) => selectAllEntities(state, entity)),
	);

	return items;
}