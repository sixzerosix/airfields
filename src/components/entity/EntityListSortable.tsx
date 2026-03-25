"use client";

/**
 * EntityListSortable — drag-and-drop обёртка для EntityList
 *
 * Оборачивает список в DndContext + SortableContext.
 * Каждый элемент оборачивается в SortableItem (drag handle + transform).
 *
 * USAGE:
 * ```tsx
 * const reorder = useEntityReorder("notes", items);
 *
 * <EntityListSortable
 *   entity="notes"
 *   initialData={initialNotes}
 *   items={sortedItems}
 *   reorder={reorder}
 * >
 *   {(note) => (
 *     <div>{note.title}</div>
 *   )}
 * </EntityListSortable>
 * ```
 */

import { type ReactNode } from "react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragOverlay,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useEntityList } from "@/hooks/useEntityList";
import type { UseEntityReorderReturn } from "@/hooks/useEntityReorder";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EntityListSortableProps<E extends EntityType> {
	entity: E;
	initialData: EntityDataMap[E][];
	items: EntityDataMap[E][];
	reorder: UseEntityReorderReturn;
	children: (item: EntityDataMap[E], index: number) => ReactNode;
	className?: string;
	empty?: ReactNode;

	/** Показывать drag handle (⠿) @default true */
	showHandle?: boolean;

	/** Компонент для DragOverlay (что видно при перетаскивании) */
	renderOverlay?: (item: EntityDataMap[E]) => ReactNode;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EntityListSortable<E extends EntityType>({
	entity,
	initialData,
	items,
	reorder,
	children,
	className,
	empty,
	showHandle = true,
	renderOverlay,
}: EntityListSortableProps<E>) {
	// Store sync + realtime (всегда нужно)
	useEntityList(entity, initialData);

	// Sensors для dnd-kit
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // 8px до начала drag — предотвращает случайный drag при клике
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const itemIds = items.map((item) => (item as any).id as string);

	// Active item для overlay
	const activeItem = reorder.activeId
		? items.find((item) => (item as any).id === reorder.activeId)
		: null;

	// ==========================================================================
	// EMPTY
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
	// DRAG DISABLED — обычный список
	// ==========================================================================

	if (!reorder.enabled) {
		return (
			<div className={className}>
				{items.map((item, index) => (
					<div key={(item as any).id}>{children(item, index)}</div>
				))}
			</div>
		);
	}

	// ==========================================================================
	// DRAG ENABLED — sortable список
	// ==========================================================================

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			modifiers={[restrictToVerticalAxis]}
			onDragStart={reorder.handleDragStart}
			onDragEnd={reorder.handleDragEnd}
		>
			<SortableContext
				items={itemIds}
				strategy={verticalListSortingStrategy}
			>
				<div className={className}>
					{items.map((item, index) => (
						<SortableItem
							key={(item as any).id}
							id={(item as any).id}
							showHandle={showHandle}
						>
							{children(item, index)}
						</SortableItem>
					))}
				</div>
			</SortableContext>

			{/* Overlay — что видно при перетаскивании */}
			<DragOverlay>
				{activeItem ? (
					<div className="opacity-80 gap-3 p-3 border rounded-lg">
						{renderOverlay
							? renderOverlay(activeItem)
							: children(activeItem, -1)}
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}

// ============================================================================
// SORTABLE ITEM — обёртка для каждого элемента
// ============================================================================

interface SortableItemProps {
	id: string;
	children: ReactNode;
	showHandle: boolean;
}

function SortableItem({ id, children, showHandle }: SortableItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn("relative", isDragging && "z-50 opacity-50")}
			{...(!showHandle ? { ...attributes, ...listeners } : {})}
		>
			<div className="flex items-center gap-3 p-3 border rounded-lg">
				{/* Drag handle */}
				{showHandle && (
					<button
						className={cn(
							"flex-shrink-0 cursor-grab active:cursor-grabbing",
							"p-1.5 rounded hover:bg-muted text-muted-foreground",
							"touch-none select-none",
						)}
						{...attributes}
						{...listeners}
					>
						<GripVertical className="h-4 w-4" />
					</button>
				)}

				{/* Content */}
				<div className="flex-1 min-w-0">{children}</div>
			</div>
		</div>
	);
}

// ============================================================================
// EXPORT TYPE for useEntityReorder
// ============================================================================

export type { UseEntityReorderReturn } from "@/hooks/useEntityReorder";
