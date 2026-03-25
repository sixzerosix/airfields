"use client";

/**
 * CreateEntityInline — создание прямо в списке (без модалки)
 *
 * Раскрывается над списком, поля внутри, кнопки Create/Cancel.
 *
 * РЕЖИМЫ:
 * - autoClose={true}  → после создания закрывается (нужно снова жать +)
 * - autoClose={false} → после создания поля сбрасываются, можно создавать дальше
 * - alwaysOpen={true}  → всегда раскрыт, без кнопки-триггера
 *
 * USAGE:
 * ```tsx
 * <CreateEntityInline
 *   entity="notes"
 *   initialValues={{ status: "draft" }}
 *   trigger={<Button><Plus /> New Note</Button>}
 * >
 *   {(tempId) => (
 *     <>
 *       <EntityField entity="notes" entityId={tempId} name="title" />
 *       <EntityField entity="notes" entityId={tempId} name="description" />
 *     </>
 *   )}
 * </CreateEntityInline>
 * ```
 */

import { useState, useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { DraftContext } from "@/contexts/DraftContext";
import { useEntityDraft } from "@/hooks/useEntityDraft";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface CreateEntityInlineProps<E extends EntityType> {
	entity: E;
	children: (tempId: string) => ReactNode;

	/** Кнопка-триггер (не нужна если alwaysOpen) */
	trigger?: ReactNode;

	/** Начальные значения */
	initialValues?: Partial<EntityDataMap[E]>;

	/** Закрывать после создания? @default true */
	autoClose?: boolean;

	/** Всегда раскрыт (без триггера) @default false */
	alwaysOpen?: boolean;

	/** Текст кнопки Create */
	submitText?: string;

	/** Текст кнопки Cancel */
	cancelText?: string;

	/** CSS для обёртки формы */
	className?: string;

	/** Callback после создания */
	onSuccess?: (id: string) => void;

	/** Callback при ошибке */
	onError?: (error: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateEntityInline<E extends EntityType>({
	entity,
	children,
	trigger,
	initialValues,
	autoClose = true,
	alwaysOpen = false,
	submitText = "Create",
	cancelText = "Cancel",
	className,
	onSuccess,
	onError,
}: CreateEntityInlineProps<E>) {
	const [isOpen, setIsOpen] = useState(alwaysOpen);

	const { tempId, create, reset, clearFields, isCreating } = useEntityDraft(
		entity,
		{
			initialValues,
			onSuccess: (id) => {
				if (autoClose) {
					// Закрыть и сбросить
					setIsOpen(false);
					reset();
				} else {
					// Оставить открытым, сбросить поля для следующей записи
					reset();
				}
				onSuccess?.(id);
			},
			onError,
		},
	);

	// ==========================================================================
	// HANDLERS
	// ==========================================================================

	const handleOpen = useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		reset();
	}, [reset]);

	// ==========================================================================
	// TRIGGER (если не alwaysOpen)
	// ==========================================================================

	if (!isOpen && !alwaysOpen) {
		return (
			<div onClick={handleOpen} className="inline-flex">
				{trigger || <Button>+ New</Button>}
			</div>
		);
	}

	// ==========================================================================
	// INLINE FORM
	// ==========================================================================

	return (
		<div
			className={
				className ||
				"border rounded-xl p-4 space-y-4 bg-card animate-in fade-in slide-in-from-top-2 duration-200"
			}
		>
			{/* Close button (если не alwaysOpen) */}
			{!alwaysOpen && (
				// <div className="flex justify-end">
				// 	<Button
				// 		variant="ghost"
				// 		size="icon"
				// 		onClick={handleClose}
				// 		className="h-6 w-6"
				// 	>
				// 		<X className="h-4 w-4" />
				// 	</Button>
				// </div>
				<span></span>
			)}

			{/* Fields — DraftContext forces saveMode="manual" */}
			<DraftContext.Provider value={true}>
				<div key={tempId}>{children(tempId)}</div>
			</DraftContext.Provider>

			{/* Buttons */}
			<div className="flex items-center gap-2">
				<Button onClick={create} disabled={isCreating} size="sm">
					{isCreating ? "Creating..." : submitText}
				</Button>

				{!alwaysOpen && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClose}
						disabled={isCreating}
					>
						{cancelText}
					</Button>
				)}

				{alwaysOpen && (
					<Button
						variant="ghost"
						size="sm"
						onClick={clearFields}
						disabled={isCreating}
					>
						Clear
					</Button>
				)}
			</div>
		</div>
	);
}
