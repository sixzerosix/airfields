"use client";

/**
 * CreateEntityDialog — модалка для создания записей
 *
 * ✅ Оборачивает children в DraftContext.Provider
 *    → все EntityField внутри автоматически saveMode="manual"
 *    → не нужно помнить про customProps
 */

import { useState, type ReactNode } from "react";
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
import { DraftContext } from "@/contexts/DraftContext";
import { useEntityDraft } from "@/hooks/useEntityDraft";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface CreateEntityDialogProps<E extends EntityType> {
	entity: E;
	trigger: ReactNode;
	children: (tempId: string) => ReactNode;
	title?: string;
	description?: string;
	initialValues?: Partial<EntityDataMap[E]>;
	onSuccess?: (id: string) => void;
	onError?: (error: string) => void;
	submitText?: string;
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
	initialValues,
	onSuccess,
	onError,
	submitText = "Create",
	cancelText = "Cancel",
}: CreateEntityDialogProps<E>) {
	const [open, setOpen] = useState(false);

	const { tempId, create, reset, isCreating } = useEntityDraft(entity, {
		initialValues,
		onSuccess: (id) => {
			setOpen(false);
			reset();
			onSuccess?.(id);
		},
		onError,
	});

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen && !isCreating) {
			reset();
		}
		setOpen(nextOpen);
	};

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

				{/* ✅ DraftContext → все EntityField внутри = saveMode="manual" */}
				<DraftContext.Provider value={true}>
					<div className="space-y-4 py-4">
						{open && children(tempId)}
					</div>
				</DraftContext.Provider>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isCreating}
					>
						{cancelText}
					</Button>
					<Button
						type="button"
						onClick={create}
						disabled={isCreating}
					>
						{isCreating ? "Creating..." : submitText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
