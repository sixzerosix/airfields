"use client";

/**
 * EntityList - Universal List Wrapper
 *
 * Обёртка над useEntityList для случаев когда нужен готовый компонент.
 * Если нужен кастомный layout (table, kanban, etc.) — используй useEntityList напрямую.
 *
 * USAGE:
 * ```tsx
 * // Client Component
 * <EntityList entity="notes" initialData={notes}>
 *   {(note) => (
 *     <Link href={`/notes/${note.id}`}>
 *       <div>{note.title}</div>
 *     </Link>
 *   )}
 * </EntityList>
 * ```
 */

import { type ReactNode } from "react";
import { useEntityList } from "@/hooks/useEntityList";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface EntityListProps<E extends EntityType> {
	/** Тип сущности */
	entity: E;

	/** Начальные данные с сервера */
	initialData: EntityDataMap[E][];

	/** Render function для каждого элемента */
	children: (item: EntityDataMap[E], index: number) => ReactNode;

	/** Wrapper className */
	className?: string;

	/** Empty state */
	empty?: ReactNode;

	/** Подписываться ли на real-time? @default true */
	enableRealtime?: boolean;

	/** Фильтр для real-time подписки */
	filter?: { column: string; value: string };
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
}: EntityListProps<E>) {
	// ✅ Вся логика в хуке — НОЛЬ дублирования
	const items = useEntityList(entity, initialData, {
		enableRealtime,
		filter,
	});

	// ==========================================================================
	// EMPTY STATE
	// ==========================================================================

	if (items.length === 0) {
		if (empty) return <>{empty}</>;

		return (
			<div className="p-6 text-center text-muted-foreground">
				No items found
			</div>
		);
	}

	// ==========================================================================
	// RENDER
	// ==========================================================================

	return (
		<div className={className}>
			{items.map((item, index) => (
				<div key={(item as any).id}>{children(item, index)}</div>
			))}
		</div>
	);
}

// ============================================================================
// PRESET LAYOUTS
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
