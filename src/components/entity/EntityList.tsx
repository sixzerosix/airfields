"use client";

import { type ReactNode } from "react";
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
	 * Сортировка.
	 * @default { field: "updated_at", direction: "desc" } — новые сверху
	 */
	sort?: { field: string; direction: "asc" | "desc" };
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
	sort,
}: EntityListProps<E>) {
	const items = useEntityList(entity, initialData, {
		enableRealtime,
		filter,
		sort,
	});

	if (items.length === 0) {
		if (empty) return <>{empty}</>;
		return (
			<div className="p-6 text-center text-muted-foreground">
				No items found
			</div>
		);
	}

	return (
		<div className={className}>
			{items.map((item, index) => (
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
