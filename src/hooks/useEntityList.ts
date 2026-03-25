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

	/**
	 * Сортировка списка.
	 * @default { field: "updated_at", direction: "desc" }
	 */
	sort?: {
		field: string;
		direction: "asc" | "desc";
	};
}

// ============================================================================
// HOOK
// ============================================================================

export function useEntityList<E extends EntityType>(
	entity: E,
	initialData: EntityDataMap[E][],
	options?: UseEntityListOptions,
): EntityDataMap[E][] {
	const {
		enableRealtime = true,
		filter,
		sort = { field: "updated_at", direction: "desc" },
	} = options || {};

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
	// GET FROM STORE (sorted)
	// ==========================================================================

	const items = useStore(
		useShallow((state) => {
			const all = selectAllEntities(state, entity);

			// ✅ Сортировка
			if (!sort) return all;

			return [...all].sort((a, b) => {
				const aVal = (a as any)[sort.field];
				const bVal = (b as any)[sort.field];

				if (aVal == null && bVal == null) return 0;
				if (aVal == null) return sort.direction === "desc" ? 1 : -1;
				if (bVal == null) return sort.direction === "desc" ? -1 : 1;

				const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
				return sort.direction === "desc" ? -comparison : comparison;
			});
		}),
	);

	return items;
}