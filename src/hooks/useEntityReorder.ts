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
	priorityFields?: string[];
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
	sortByPosition: <T extends Record<string, any>>(items: T[]) => T[];
}

// ============================================================================
// HOOK
// ============================================================================

export function useEntityReorder<E extends EntityType>(
	entity: E,
	items: EntityDataMap[E][],
	config: UseEntityReorderConfig = {},
): UseEntityReorderReturn {
	const {
		enabled: initialEnabled = false,
		priorityFields = [],
		onSuccess,
		onError,
	} = config;

	const [enabled, setEnabled] = useState(initialEnabled);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const backupRef = useRef<{ id: string; position: string } | null>(null);

	// ==========================================================================
	// TOGGLE
	// ==========================================================================

	const toggle = useCallback(() => setEnabled((prev) => !prev), []);

	// ==========================================================================
	// SORT BY POSITION (с priority)
	// ==========================================================================

	const sortByPosition = useCallback(
		<T extends Record<string, any>>(data: T[]): T[] => {
			return [...data].sort((a, b) => {
				// 1. Priority fields
				for (const pf of priorityFields) {
					const aP = a[pf] ? 1 : 0;
					const bP = b[pf] ? 1 : 0;
					if (aP !== bP) return bP - aP;
				}

				// 2. Position
				const posA = a.position ?? "";
				const posB = b.position ?? "";
				if (posA !== posB) return posA < posB ? -1 : 1;

				// 3. Created
				const dateA = a.created_at ?? "";
				const dateB = b.created_at ?? "";
				return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
			});
		},
		[priorityFields],
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

			// ==============================================================
			// ВИЗУАЛЬНЫЙ порядок (с priority) — то что user видит на экране
			// ==============================================================

			const visualSorted = sortByPosition(items);
			const visualIds = visualSorted.map(
				(item) => (item as any).id as string,
			);

			const oldIndex = visualIds.indexOf(String(active.id));
			const newIndex = visualIds.indexOf(String(over.id));

			if (oldIndex === -1 || newIndex === -1) return;

			// Новый визуальный порядок после перемещения
			const newVisualIds = [...visualIds];
			const [movedId] = newVisualIds.splice(oldIndex, 1);
			newVisualIds.splice(newIndex, 0, movedId);

			const movedNewIndex = newVisualIds.indexOf(movedId);

			// ==============================================================
			// Находим соседей и их position ключи
			// ==============================================================

			const prevId =
				movedNewIndex > 0 ? newVisualIds[movedNewIndex - 1] : null;
			const nextId =
				movedNewIndex < newVisualIds.length - 1
					? newVisualIds[movedNewIndex + 1]
					: null;

			const prevKey = prevId
				? ((items.find((i) => (i as any).id === prevId) as any)
					?.position ?? null)
				: null;
			const nextKey = nextId
				? ((items.find((i) => (i as any).id === nextId) as any)
					?.position ?? null)
				: null;

			// ==============================================================
			// ✅ SAFE KEY: priority sort может нарушить position порядок
			// Пример: favorite с position "a6G" визуально перед "a5"
			// → prevKey="a6G" >= nextKey="a5" → generateKeyBetween падает
			// Решение: использовать только одного соседа
			// ==============================================================

			let safePrevKey = prevKey;
			let safeNextKey = nextKey;

			if (safePrevKey && safeNextKey && safePrevKey >= safeNextKey) {
				// Priority нарушил порядок — берём только nextKey
				safePrevKey = null;
			}

			let newKey: string;
			try {
				newKey = generateKeyBetween(safePrevKey, safeNextKey);
			} catch (err) {
				console.error(
					"[useEntityReorder] Failed to generate key:",
					err,
				);
				toast.error("Failed to reorder");
				return;
			}

			// ==============================================================
			// OPTIMISTIC UPDATE — только 1 запись
			// ==============================================================

			const store = useStore.getState();
			const currentPosition = (
				store.entities[entity]?.[movedId] as any
			)?.position;

			backupRef.current = { id: movedId, position: currentPosition };

			store.updateField(entity, movedId, "position" as any, newKey);

			// ==============================================================
			// SERVER UPDATE — 1 запрос
			// ==============================================================

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