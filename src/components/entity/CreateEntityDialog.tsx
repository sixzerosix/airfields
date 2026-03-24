"use client";

/**
 * CreateEntityDialog - Modal for Creating Entities
 *
 * ИСПРАВЛЕНИЯ:
 * 1. children — render prop (tempId) => ReactNode, чтобы дочерние EntityField
 *    получали правильный entityId
 * 2. Новый tempId при каждом открытии (а не один на весь lifecycle)
 * 3. Cleanup при закрытии без сохранения
 * 4. Store init для temp записи при открытии
 *
 * USAGE:
 * ```tsx
 * <CreateEntityDialog
 *   entity="notes"
 *   trigger={<Button>New Note</Button>}
 *   onSuccess={(id) => router.push(`/notes/${id}`)}
 * >
 *   {(tempId) => (
 *     <>
 *       <EntityField entity="notes" entityId={tempId} name="title" />
 *       <EntityField entity="notes" entityId={tempId} name="description" />
 *     </>
 *   )}
 * </CreateEntityDialog>
 * ```
 */

import { useState, useRef, useCallback, type ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { createEntityAction } from "@/actions/update-entity";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface CreateEntityDialogProps<E extends EntityType> {
	/** Тип сущности */
	entity: E;

	/** Trigger button */
	trigger: ReactNode;

	/**
	 * ✅ Render prop — получает tempId для передачи в EntityField
	 *
	 * Почему render prop, а не ReactNode?
	 * tempId генерируется ВНУТРИ Dialog. Обычные children
	 * создаются СНАРУЖИ и не имеют к нему доступа.
	 */
	children: (tempId: string) => ReactNode;

	/** Dialog title */
	title?: string;

	/** Dialog description */
	description?: string;

	/** Начальные значения полей */
	initialValues?: Partial<EntityDataMap[E]>;

	/** Callback после успешного создания */
	onSuccess?: (id: string) => void;

	/** Callback при ошибке */
	onError?: (error: string) => void;

	/** Submit button text */
	submitText?: string;

	/** Cancel button text */
	cancelText?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateEntityDialog<E extends EntityType>({
	entity,
	trigger,
	children,
	title,
	description,
	initialValues = {},
	onSuccess,
	onError,
	submitText = "Create",
	cancelText = "Cancel",
}: CreateEntityDialogProps<E>) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	// ✅ Новый tempId при каждом ОТКРЫТИИ модалки
	const tempIdRef = useRef<string>("");

	// ==========================================================================
	// OPEN / CLOSE
	// ==========================================================================

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) {
				// Открытие: генерируем новый tempId, создаём temp запись в Store
				tempIdRef.current = uuidv4();
				useStore.getState().upsertEntity(entity, tempIdRef.current, {
					id: tempIdRef.current,
					...initialValues,
				} as EntityDataMap[E]);
			} else if (!loading) {
				// Закрытие без сохранения: чистим Store
				if (tempIdRef.current) {
					useStore.getState().deleteEntity(entity, tempIdRef.current);
				}
			}
			setOpen(nextOpen);
		},
		[entity, initialValues, loading],
	);

	// ==========================================================================
	// CREATE
	// ==========================================================================

	const handleCreate = async () => {
		const tempId = tempIdRef.current;
		if (!tempId) return;

		setLoading(true);

		try {
			const store = useStore.getState();
			const data = store.entities[entity]?.[tempId];

			if (!data) {
				throw new Error("No data to save");
			}

			const result = await createEntityAction({
				entity,
				data: {
					...initialValues,
					...data,
					id: tempId,
				},
			});

			if (!result?.data) {
				throw new Error("Failed to create");
			}

			toast.success("Created!");
			setOpen(false);

			// НЕ удаляем из Store — запись теперь реальная
			onSuccess?.(tempId);
		} catch (error: any) {
			console.error("[CreateEntityDialog] Error:", error);
			toast.error(error.message || "Failed to create");
			onError?.(error.message);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		handleOpenChange(false);
	};

	// ==========================================================================
	// RENDER
	// ==========================================================================

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>

			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>{title || `Create ${entity}`}</DialogTitle>
					{description && (
						<DialogDescription>{description}</DialogDescription>
					)}
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* ✅ Render prop — tempId доступен дочерним EntityField */}
					{open && tempIdRef.current && children(tempIdRef.current)}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						disabled={loading}
					>
						{cancelText}
					</Button>
					<Button
						type="button"
						onClick={handleCreate}
						disabled={loading}
					>
						{loading ? "Creating..." : submitText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
