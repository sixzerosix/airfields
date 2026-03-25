import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { deleteEntityAction } from "@/actions/update-entity";
import type { EntityType } from "@/lib/schemas";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface UseEntityDeleteOptions {
	/** Куда редиректить после удаления */
	redirectTo?: string;

	/** Callback после успешного удаления */
	onSuccess?: (id: string) => void;

	/** Callback при ошибке */
	onError?: (error: string) => void;

	/** Удалить из Store сразу (optimistic) или после ответа сервера */
	optimistic?: boolean;
}

interface UseEntityDeleteReturn {
	/** Удалить запись */
	remove: (entityId: string) => Promise<boolean>;

	/** Идёт ли удаление */
	isDeleting: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useEntityDelete — логика удаления сущности
 *
 * @example
 * ```tsx
 * const { remove, isDeleting } = useEntityDelete("notes", {
 *   redirectTo: "/notes",
 *   onSuccess: (id) => console.log("Deleted:", id),
 * });
 *
 * await remove(noteId);
 * ```
 */
export function useEntityDelete(
	entity: EntityType,
	options: UseEntityDeleteOptions = {},
): UseEntityDeleteReturn {
	const { redirectTo, onSuccess, onError, optimistic = true } = options;
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState(false);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const remove = useCallback(
		async (entityId: string): Promise<boolean> => {
			if (isDeleting) return false;
			setIsDeleting(true);

			// Optimistic: удаляем из Store сразу
			let backup: any = null;
			if (optimistic) {
				backup = useStore.getState().entities[entity]?.[entityId];
				useStore.getState().deleteEntity(entity, entityId);
			}

			try {
				const result = await deleteEntityAction({ entity, entityId });

				if (result?.serverError) {
					throw new Error(result.serverError);
				}

				// Если не optimistic — удаляем из Store после подтверждения
				if (!optimistic) {
					useStore.getState().deleteEntity(entity, entityId);
				}

				toast.success("Deleted!");
				optionsRef.current.onSuccess?.(entityId);

				if (optionsRef.current.redirectTo) {
					router.push(optionsRef.current.redirectTo);
				}

				return true;
			} catch (error: any) {
				console.error("[useEntityDelete] Error:", error);

				// Откат optimistic удаления
				if (optimistic && backup) {
					useStore.getState().upsertEntity(entity, entityId, backup);
				}

				toast.error(error.message || "Failed to delete");
				optionsRef.current.onError?.(error.message);
				return false;
			} finally {
				setIsDeleting(false);
			}
		},
		[entity, isDeleting, optimistic, router],
	);

	return { remove, isDeleting };
}
