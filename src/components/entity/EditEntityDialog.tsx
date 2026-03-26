"use client";

/**
 * EditEntityDialog - ОДИН Dialog на весь список
 *
 * ✅ Добавлен footer prop для кнопок (Delete, etc.)
 *
 * USAGE:
 * ```tsx
 * <EditEntityDialog
 *   entity="notes"
 *   entityId={editingId}
 *   onClose={() => setEditingId(null)}
 *   title="Edit Note"
 *   footer={(id) => (
 *     <DeleteEntityButton entity="notes" entityId={id} ... />
 *   )}
 * >
 *   {(id) => (
 *     <EntityField entity="notes" entityId={id} name="title" />
 *   )}
 * </EditEntityDialog>
 * ```
 */

import { type ReactNode } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { EntityEditor } from "@/components/entity/EntityEditor";
import type { EntityType } from "@/lib/schemas";
import { preventPortaledClose } from "@/lib/preventPortaledClose";

// ============================================================================
// TYPES
// ============================================================================

interface EditEntityDialogProps<E extends EntityType> {
	entity: E;
	entityId: string | null;
	children: (entityId: string) => ReactNode;
	onClose: () => void;
	title?: string;
	description?: string;
	className?: string;
	enableRealtime?: boolean;

	/**
	 * Footer с кнопками (Delete, etc.)
	 * Render prop — получает entityId.
	 */
	footer?: (entityId: string) => ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditEntityDialog<E extends EntityType>({
	entity,
	entityId,
	children,
	onClose,
	title,
	description,
	className = "sm:max-w-[600px]",
	enableRealtime = true,
	footer,
}: EditEntityDialogProps<E>) {
	const isOpen = entityId !== null;

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent
				className={className}
				onPointerDownOutside={preventPortaledClose}
				onInteractOutside={preventPortaledClose}
			>
				{title && (
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
				)}

				{entityId && (
					<EntityEditor
						entity={entity}
						entityId={entityId}
						enableRealtime={enableRealtime}
						onDeleted={onClose}
					>
						<div className="space-y-4 py-2">
							{children(entityId)}
						</div>
					</EntityEditor>
				)}

				{/* ✅ Footer с кнопками */}
				{entityId && footer && (
					<DialogFooter>{footer(entityId)}</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
