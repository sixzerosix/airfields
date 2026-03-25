"use client";

/**
 * EditEntityDialog - ОДИН Dialog на весь список
 *
 * Вместо создания Dialog на каждый элемент — один Dialog наверху,
 * открывается вызовом editingId через state.
 *
 * USAGE:
 * ```tsx
 * function NotesList({ initialNotes }) {
 *   const [editingId, setEditingId] = useState<string | null>(null);
 *
 *   return (
 *     <div>
 *       {notes.map(note => (
 *         <div key={note.id}>
 *           <span>{note.title}</span>
 *           <Button onClick={() => setEditingId(note.id)}>Edit</Button>
 *         </div>
 *       ))}
 *
 *       {/* ✅ ОДИН Dialog на весь список *\/ }
 *       <EditEntityDialog
 *         entity="notes"
 *         entityId={editingId}
 *         onClose={() => setEditingId(null)}
 *         title="Edit Note"
 *       >
 *         {(id) => (
 *           <>
 *             <EntityField entity="notes" entityId={id} name="title" />
 *             <EntityField entity="notes" entityId={id} name="description" />
 *             <EntityField entity="notes" entityId={id} name="status" />
 *           </>
 *         )}
 *       </EditEntityDialog>
 *     </div>
 *   )
 * }
 * ```
 */

import { type ReactNode } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { EntityEditor } from "@/components/entity/EntityEditor";
import type { EntityType } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface EditEntityDialogProps<E extends EntityType> {
	/** Тип сущности */
	entity: E;

	/**
	 * ID сущности для редактирования.
	 * - string → Dialog открыт с этой сущностью
	 * - null → Dialog закрыт
	 */
	entityId: string | null;

	/**
	 * Render prop — получает entityId для передачи в EntityField.
	 *
	 * Почему render prop, а не ReactNode?
	 * entityId меняется при каждом клике на другой элемент.
	 * ReactNode children были бы "запечатаны" с предыдущим id.
	 */
	children: (entityId: string) => ReactNode;

	/** Callback при закрытии — ОБЯЗАТЕЛЬНО сбрасывай editingId в null! */
	onClose: () => void;

	/** Dialog title */
	title?: string;

	/** Dialog description */
	description?: string;

	/** Dialog max width class */
	className?: string;

	/** Realtime? @default true */
	enableRealtime?: boolean;
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
}: EditEntityDialogProps<E>) {
	const isOpen = entityId !== null;

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className={className} aria-describedby={undefined}>
				{title && (
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
				)}

				{/*
					✅ Монтируется ТОЛЬКО когда entityId !== null
					EntityEditor:
					  - Данные уже в Store (положены EntityList/useEntityList)
					  - initialData не нужен — EntityField читает из Store
					  - Realtime подписка создаётся при открытии, чистится при закрытии
				*/}
				{entityId && (
					<EntityEditor
						entity={entity}
						entityId={entityId}
						enableRealtime={enableRealtime}
					>
						<div className="space-y-4 py-2">
							{children(entityId)}
						</div>
					</EntityEditor>
				)}
			</DialogContent>
		</Dialog>
	);
}
