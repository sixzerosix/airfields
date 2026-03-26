"use client";

/**
 * useEntityReorder v2 — Fractional Indexing
 *
 * npm install fractional-indexing
 *
 * При перетаскивании:
 * - Вычисляет ОДИН новый ключ между соседями
 * - Обновляет ОДНУ запись (перемещённую)
 * - На 3000 записей: 1 UPDATE вместо 3000
 *
 * Принцип:
 *   Positions: "a0"  "a1"  "a2"  "a3"
 *   Drag a3 между a0 и a1:
 *   → generateKeyBetween("a0", "a1") = "a0V"
 *   → UPDATE notes SET position = "a0V" WHERE id = dragged_id
 *   → Новый порядок: "a0" "a0V" "a1" "a2" (строковая сортировка)
 */

import { useState, useCallback, useRef } from "react";
import { generateKeyBetween } from "fractional-indexing";
import { useStore } from "@/lib/store";
import { updateEntityAction } from "@/actions/update-entity";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { toast } from "sonner";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

// ============================================================================
// TYPES
// ============================================================================

interface UseEntityReorderConfig {
	enabled?: boolean;
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

export interface UseEntityReorderReturn {
	enabled: boolean;
	setEnabled: (enabled: boolean) => void;
	toggle: () => void;
	activeId: string | null;
	handleDragStart: (event: DragStartEvent) => void;
	handleDragEnd: (event: DragEndEvent) => void;
	isSaving: boolean;
	sortByPosition: <T extends { position?: string | null; created_at?: string }>(
		items: T[],
	) => T[];
}

// ============================================================================
// HOOK
// ============================================================================

export function useEntityReorder<E extends EntityType>(
	entity: E,
	items: EntityDataMap[E][],
	config: UseEntityReorderConfig = {},
): UseEntityReorderReturn {
	const { enabled: initialEnabled = false, onSuccess, onError } = config;

	const [enabled, setEnabled] = useState(initialEnabled);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const backupRef = useRef<{ id: string; position: string } | null>(null);

	// ==========================================================================
	// TOGGLE
	// ==========================================================================

	const toggle = useCallback(() => setEnabled((prev) => !prev), []);

	// ==========================================================================
	// SORT BY POSITION (string comparison)
	// ==========================================================================

	const sortByPosition = useCallback(
		<T extends { position?: string | null; created_at?: string }>(
			data: T[],
		): T[] => {
			return [...data].sort((a, b) => {
				const posA = a.position ?? "";
				const posB = b.position ?? "";

				// Primary: position (string sort — fractional indexing гарантирует порядок)
				if (posA !== posB) return posA < posB ? -1 : 1;

				// Secondary: created_at
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

			// Текущий порядок (уже отсортированный по position)
			const sorted = sortByPosition(items);
			const ids = sorted.map((item) => (item as any).id as string);

			const oldIndex = ids.indexOf(String(active.id));
			const newIndex = ids.indexOf(String(over.id));

			if (oldIndex === -1 || newIndex === -1) return;

			// ================================================================
			// ВЫЧИСЛИТЬ НОВЫЙ FRACTIONAL KEY
			// ================================================================

			// Новый порядок IDs после перемещения
			const newIds = [...ids];
			const [movedId] = newIds.splice(oldIndex, 1);
			newIds.splice(newIndex, 0, movedId);

			// Найти соседей перемещённого элемента в новом порядке
			const movedNewIndex = newIds.indexOf(movedId);

			const prevItem = movedNewIndex > 0
				? sorted.find((item) => (item as any).id === newIds[movedNewIndex - 1])
				: null;

			const nextItem = movedNewIndex < newIds.length - 1
				? sorted.find((item) => (item as any).id === newIds[movedNewIndex + 1])
				: null;

			const prevKey = (prevItem as any)?.position ?? null;
			const nextKey = (nextItem as any)?.position ?? null;

			let newKey: string;
			try {
				newKey = generateKeyBetween(prevKey, nextKey);
			} catch (err) {
				console.error("[useEntityReorder] Failed to generate key:", err);
				toast.error("Failed to reorder");
				return;
			}

			// ================================================================
			// OPTIMISTIC UPDATE — только 1 запись
			// ================================================================

			const store = useStore.getState();
			const currentPosition = (store.entities[entity]?.[movedId] as any)?.position;

			// Backup для отката
			backupRef.current = { id: movedId, position: currentPosition };

			// Обновляем Store
			store.updateField(entity, movedId, "position" as any, newKey);

			// ================================================================
			// SERVER UPDATE — 1 запрос
			// ================================================================

			setIsSaving(true);

			try {
				const result = await updateEntityAction({
					entity,
					entityId: movedId,
					field: "position",
					value: newKey,
				});

				if (result?.serverError) {
					throw new Error(result.serverError);
				}

				onSuccess?.();
			} catch (error: any) {
				console.error("[useEntityReorder] Error:", error);

				// ОТКАТ
				if (backupRef.current) {
					store.updateField(
						entity,
						backupRef.current.id,
						"position" as any,
						backupRef.current.position,
					);
				}

				toast.error("Failed to save order");
				onError?.(error.message);
			} finally {
				setIsSaving(false);
				backupRef.current = null;
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