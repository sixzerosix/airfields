"use client";

/**
 * CreateEntityPage — Notion-style создание
 *
 * ✅ DraftContext для auto manual mode
 *
 * ВАЖНО: Это Client Component. Из Server Component (page.tsx)
 * НЕЛЬЗЯ передать функцию как children.
 * Используй клиентский wrapper — см. пример ниже.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { DraftContext } from "@/contexts/DraftContext";
import { useEntityDraft } from "@/hooks/useEntityDraft";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface CreateEntityPageProps<E extends EntityType> {
	entity: E;
	children: (tempId: string) => ReactNode;
	redirectTo?: string;
	initialValues?: Partial<EntityDataMap[E]>;
	className?: string;
	onSuccess?: (id: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateEntityPage<E extends EntityType>({
	entity,
	children,
	redirectTo,
	initialValues,
	className,
	onSuccess,
}: CreateEntityPageProps<E>) {
	const { tempId, create, isCreating } = useEntityDraft(entity, {
		initialValues,
		redirectTo,
		onSuccess,
	});

	const createdRef = useRef(false);

	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	// Auto-create on first change
	useEffect(() => {
		if (createdRef.current) return;

		const unsubscribe = useStore.subscribe((state, prevState) => {
			if (createdRef.current || isCreating) return;

			const currentData = state.entities[entity]?.[tempId];
			const prevData = prevState.entities[entity]?.[tempId];
			if (!currentData || !prevData) return;

			const hasChanges = Object.keys(currentData).some((key) => {
				if (["id", "created_at", "updated_at"].includes(key))
					return false;
				const curr = (currentData as any)[key];
				const prev = (prevData as any)[key];
				if (!curr && !prev) return false;
				return curr !== prev;
			});

			if (hasChanges) {
				createdRef.current = true;
				create();
			}
		});

		return unsubscribe;
	}, [entity, tempId, isCreating, create]);

	return (
		<DraftContext.Provider value={true}>
			<div className={className}>
				{mounted && <div key={tempId}>{children(tempId)}</div>}
			</div>
		</DraftContext.Provider>
	);
}
