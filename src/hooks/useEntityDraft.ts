import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "@/lib/store";
import { createEntityAction } from "@/actions/update-entity";
import { getM2MFields } from "@/lib/registry";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface UseEntityDraftOptions<E extends EntityType> {
	initialValues?: Partial<EntityDataMap[E]>;
	redirectTo?: string;
	onSuccess?: (id: string) => void;
	onError?: (error: string) => void;
}

interface UseEntityDraftReturn {
	tempId: string;
	create: () => Promise<string | null>;
	reset: () => void;
	clearFields: () => void;
	isCreating: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEntityDraft<E extends EntityType>(
	entity: E,
	options: UseEntityDraftOptions<E> = {},
): UseEntityDraftReturn {
	const router = useRouter();

	const [tempId, setTempId] = useState(() => {
		const id = uuidv4();
		const store = useStore.getState();

		store.upsertEntity(entity, id, {
			id,
			...options.initialValues,
		} as EntityDataMap[E]);

		store.markAsDraft(id);

		return id;
	});

	const [isCreating, setIsCreating] = useState(false);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	// =========================================================================
	// CREATE
	// =========================================================================

	const create = useCallback(async (): Promise<string | null> => {
		if (isCreating) return null;
		setIsCreating(true);

		try {
			const store = useStore.getState();
			const data = store.entities[entity]?.[tempId];

			if (!data) {
				throw new Error("No data to save — fill in at least one field");
			}

			// ✅ Автоматически извлекаем M2M relations из registry + Store
			const m2mFields = getM2MFields(entity);
			const relations: {
				junctionTable: string;
				foreignKey: string;
				ids: string[];
				polymorphic: boolean;
				entityKey?: string;
			}[] = [];

			for (const { field, relation } of m2mFields) {
				const ids = (data as any)[field];
				if (Array.isArray(ids) && ids.length > 0) {
					relations.push({
						junctionTable: relation.junctionTable,
						foreignKey: relation.foreignKey,
						ids,
						polymorphic: relation.polymorphic ?? false,
						entityKey: relation.entityKey,
					});
				}
			}

			// ✅ Вызываем server action с generic relations
			const result = await createEntityAction({
				entity,
				data: { ...data, id: tempId },
				relations: relations.length > 0 ? relations : undefined,
			});

			if (result?.serverError) {
				throw new Error(result.serverError);
			}

			if (result?.validationErrors) {
				throw new Error("Validation failed");
			}

			const createdId = result?.data?.id;
			if (!createdId) {
				throw new Error("Server did not return an ID");
			}

			// Убираем пометку draft
			useStore.getState().unmarkDraft(tempId);

			toast.success("Created!");
			optionsRef.current.onSuccess?.(tempId);

			if (optionsRef.current.redirectTo) {
				const path = optionsRef.current.redirectTo.endsWith("/")
					? `${optionsRef.current.redirectTo}${tempId}`
					: `${optionsRef.current.redirectTo}/${tempId}`;
				router.push(path);
			}

			return tempId;
		} catch (error: any) {
			console.error("[useEntityDraft] Create error:", error);
			toast.error(error.message || "Failed to create");
			optionsRef.current.onError?.(error.message);
			return null;
		} finally {
			setIsCreating(false);
		}
	}, [entity, tempId, isCreating, router]);

	// =========================================================================
	// RESET
	// =========================================================================

	const reset = useCallback(() => {
		const store = useStore.getState();
		store.deleteEntity(entity, tempId);

		const newId = uuidv4();
		store.upsertEntity(entity, newId, {
			id: newId,
			...optionsRef.current.initialValues,
		} as EntityDataMap[E]);
		store.markAsDraft(newId);

		setTempId(newId);
		setIsCreating(false);
	}, [entity, tempId]);

	// =========================================================================
	// CLEAR FIELDS
	// =========================================================================

	const clearFields = useCallback(() => {
		useStore.getState().upsertEntity(entity, tempId, {
			id: tempId,
			...optionsRef.current.initialValues,
		} as EntityDataMap[E]);
	}, [entity, tempId]);

	return { tempId, create, reset, clearFields, isCreating };
}