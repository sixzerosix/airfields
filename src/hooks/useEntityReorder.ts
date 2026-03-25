"use client";

import { useState, useCallback, useRef } from "react";
import { useStore } from "@/lib/store";
import { reorderEntitiesAction } from "@/actions/update-entity";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { toast } from "sonner";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

// ============================================================================
// TYPES
// ============================================================================

export interface UseEntityReorderConfig {
	/** Включён ли drag-and-drop @default false */
	enabled?: boolean;

	/** Callback после успешного reorder */
	onSuccess?: () => void;

	/** Callback при ошибке */
	onError?: (error: string) => void;
}

export interface UseEntityReorderReturn {
	/** Включён ли drag mode */
	enabled: boolean;

	/** Включить/выключить */
	setEnabled: (enabled: boolean) => void;

	/** Toggle */
	toggle: () => void;

	/** ID перетаскиваемого элемента (для overlay) */
	activeId: string | null;

	/** Обработчик начала drag */
	handleDragStart: (event: DragStartEvent) => void;

	/** Обработчик конца drag — основная логика reorder */
	handleDragEnd: (event: DragEndEvent) => void;

	/** Идёт ли сохранение */
	isSaving: boolean;

	/**
	 * Применить сортировку по position к items.
	 * Вызывай ВМЕСТО filters.applyTo() когда drag enabled,
	 * или chain: drag enabled ? reorder.sortByPosition(items) : filters.applyTo(items)
	 */
	sortByPosition: <T extends { position?: number; created_at?: string }>(
		items: T[],
	) => T[];
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useEntityReorder — drag-and-drop reordering для entity списков
 *
 * Логика (как в Notion/Linear):
 * 1. User перетаскивает элемент
 * 2. Optimistic: мгновенно обновляем positions в Store
 * 3. Batch update: отправляем новые positions на сервер
 * 4. При ошибке — откат
 *
 * @example
 * ```tsx
 * const reorder = useEntityReorder("notes", items);
 *
 * // В EntityListSortable:
 * <DndContext onDragStart={reorder.handleDragStart} onDragEnd={reorder.handleDragEnd}>
 *   <SortableContext items={itemIds}>
 *     {items.map(item => <SortableItem key={item.id} id={item.id} />)}
 *   </SortableContext>
 * </DndContext>
 * ```
 */
export function useEntityReorder<E extends EntityType>(
	entity: E,
	items: EntityDataMap[E][],
	config: UseEntityReorderConfig = {},
): UseEntityReorderReturn {
	const { enabled: initialEnabled = false, onSuccess, onError } = config;

	const [enabled, setEnabled] = useState(initialEnabled);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	// Backup для отката
	const backupRef = useRef<Map<string, number>>(new Map());

	// ==========================================================================
	// TOGGLE
	// ==========================================================================

	const toggle = useCallback(() => setEnabled((prev) => !prev), []);

	// ==========================================================================
	// SORT BY POSITION
	// ==========================================================================

	const sortByPosition = useCallback(
		<T extends { position?: number; created_at?: string }>(
			data: T[],
		): T[] => {
			return [...data].sort((a, b) => {
				// Primary: position (asc)
				const posA = a.position ?? Infinity;
				const posB = b.position ?? Infinity;
				if (posA !== posB) return posA - posB;

				// Secondary: created_at (asc — старые выше)
				const dateA = a.created_at ?? "";
				const dateB = b.created_at ?? "";
				return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
			});
		},
		[],
	);

	// ==========================================================================
	// DRAG HANDLERS
	// ==========================================================================

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(String(event.active.id));
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			setActiveId(null);

			const { active, over } = event;
			if (!over || active.id === over.id) return;

			// Текущий порядок items (уже отсортированный по position)
			const currentItems = sortByPosition(items);
			const ids = currentItems.map((item) => (item as any).id as string);

			const oldIndex = ids.indexOf(String(active.id));
			const newIndex = ids.indexOf(String(over.id));

			if (oldIndex === -1 || newIndex === -1) return;

			// ================================================================
			// НОВЫЙ ПОРЯДОК
			// ================================================================

			const newIds = [...ids];
			const [moved] = newIds.splice(oldIndex, 1);
			newIds.splice(newIndex, 0, moved);

			// ================================================================
			// OPTIMISTIC UPDATE — мгновенно обновляем Store
			// ================================================================

			const store = useStore.getState();
			const updates: { id: string; position: number }[] = [];

			// Сохраняем backup для отката
			backupRef.current.clear();

			newIds.forEach((id, index) => {
				const current = store.entities[entity]?.[id];
				const currentPosition = (current as any)?.position;

				// Запоминаем старую позицию
				backupRef.current.set(id, currentPosition ?? index);

				// Обновляем только если позиция изменилась
				if (currentPosition !== index) {
					store.updateField(entity, id, "position" as any, index);
					updates.push({ id, position: index });
				}
			});

			if (updates.length === 0) return;

			// ================================================================
			// SERVER UPDATE — batch
			// ================================================================

			setIsSaving(true);

			try {
				const result = await reorderEntitiesAction({
					entity,
					updates,
				});

				if (result?.serverError) {
					throw new Error(result.serverError);
				}

				onSuccess?.();
			} catch (error: any) {
				console.error("[useEntityReorder] Error:", error);

				// ОТКАТ — восстанавливаем старые позиции
				const store = useStore.getState();
				backupRef.current.forEach((oldPosition, id) => {
					store.updateField(entity, id, "position" as any, oldPosition);
				});

				toast.error("Failed to save order");
				onError?.(error.message);
			} finally {
				setIsSaving(false);
			}
		},
		[entity, items, sortByPosition, onSuccess, onError],
	);

	return {
		enabled,
		setEnabled,
		toggle,
		activeId,
		handleDragStart,
		handleDragEnd,
		isSaving,
		sortByPosition,
	};
}