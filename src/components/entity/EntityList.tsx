"use client";

/**
 * EntityList — отображает список с realtime.
 *
 * Два режима:
 * 1. Standalone (простой) — сортирует по created_at desc по умолчанию
 * 2. С useEntityFilters — принимает уже отфильтрованные items
 *
 * @example
 * // Standalone
 * <EntityList entity="notes" initialData={notes}>
 *   {(note) => <div>{note.title}</div>}
 * </EntityList>
 *
 * // С фильтрами — см. usage-examples.tsx
 */

import { useMemo, type ReactNode } from "react";
import { useEntityList } from "@/hooks/useEntityList";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface EntityListProps<E extends EntityType> {
	entity: E;
	initialData: EntityDataMap[E][];
	children: (item: EntityDataMap[E], index: number) => ReactNode;
	className?: string;
	empty?: ReactNode;
	enableRealtime?: boolean;
	filter?: { column: string; value: string };

	/**
	 * Готовые items (уже отфильтрованные/отсортированные).
	 * Если передан — initialData и realtime всё равно нужны для Store sync,
	 * но рендерятся items.
	 */
	items?: EntityDataMap[E][];

	/**
	 * Дефолтная сортировка (когда items не передан).
	 * @default { field: "created_at", direction: "desc" }
	 */
	defaultSort?: { field: string; direction: "asc" | "desc" };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EntityList<E extends EntityType>({
	entity,
	initialData,
	children,
	className,
	empty,
	enableRealtime = true,
	filter,
	items: externalItems,
	defaultSort = { field: "created_at", direction: "desc" },
}: EntityListProps<E>) {
	// Store sync + realtime (всегда нужно, даже если items переданы снаружи)
	const storeItems = useEntityList(entity, initialData, {
		enableRealtime,
		filter,
	});

	// Если items переданы снаружи (от useEntityFilters) — используем их
	// Иначе сортируем storeItems по defaultSort
	const displayItems = useMemo(() => {
		if (externalItems) return externalItems;

		return [...storeItems].sort((a, b) => {
			const aVal = (a as any)[defaultSort.field];
			const bVal = (b as any)[defaultSort.field];

			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return defaultSort.direction === "desc" ? 1 : -1;
			if (bVal == null) return defaultSort.direction === "desc" ? -1 : 1;

			const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
			return defaultSort.direction === "desc" ? -cmp : cmp;
		});
	}, [externalItems, storeItems, defaultSort]);

	if (displayItems.length === 0) {
		if (empty) return <>{empty}</>;
		return (
			<div className="p-6 text-center text-muted-foreground">
				No items found
			</div>
		);
	}

	return (
		<div className={className}>
			{displayItems.map((item, index) => (
				<div key={(item as any).id}>{children(item, index)}</div>
			))}
		</div>
	);
}

// ============================================================================
// PRESETS
// ============================================================================

export function EntityListGrid<E extends EntityType>(
	props: EntityListProps<E>,
) {
	return (
		<EntityList
			{...props}
			className={`grid gap-4 ${props.className || ""}`}
		/>
	);
}

export function EntityListCards<E extends EntityType>(
	props: EntityListProps<E>,
) {
	return (
		<EntityList
			{...props}
			className={`max-w-5xl mx-auto grid gap-3 p-4 ${props.className || ""}`}
		/>
	);
}
