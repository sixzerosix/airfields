"use client";

import { useState, type ReactNode, type ComponentProps } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useEntityDelete } from "@/hooks/useEntityDelete";
import type { EntityType } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface DeleteEntityButtonProps {
	entity: EntityType;
	entityId: string;
	confirm?: boolean;
	confirmTitle?: string;
	confirmDescription?: string;
	confirmText?: string;
	cancelText?: string;
	label?: string;
	showIcon?: boolean;
	variant?: ComponentProps<typeof Button>["variant"];
	size?: ComponentProps<typeof Button>["size"];
	redirectTo?: string;
	optimistic?: boolean;
	onSuccess?: (id: string) => void;
	onError?: (error: string) => void;
	className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DeleteEntityButton({
	entity,
	entityId,
	confirm = true,
	confirmTitle,
	confirmDescription,
	confirmText = "Delete",
	cancelText = "Cancel",
	label = "Delete",
	showIcon = true,
	variant = "destructive",
	size = "default",
	redirectTo,
	optimistic = true,
	onSuccess,
	onError,
	className,
}: DeleteEntityButtonProps) {
	const [open, setOpen] = useState(false);

	const { remove, isDeleting } = useEntityDelete(entity, {
		redirectTo,
		optimistic,
		onSuccess,
		onError,
	});

	const handleDelete = async () => {
		await remove(entityId);
		setOpen(false);
	};

	// ==========================================================================
	// TRIGGER BUTTON (всегда один и тот же — никаких children/asChild проблем)
	// ==========================================================================

	const triggerButton = (
		<Button
			variant={variant}
			size={size}
			disabled={isDeleting}
			className={className}
		>
			{isDeleting ? (
				<Loader2 className="w-4 h-4 animate-spin" />
			) : (
				showIcon && <Trash2 className="w-4 h-4" />
			)}
			{label && <span>{isDeleting ? "Deleting..." : label}</span>}
		</Button>
	);

	// ==========================================================================
	// WITHOUT CONFIRMATION
	// ==========================================================================

	if (!confirm) {
		return (
			<Button
				variant={variant}
				size={size}
				disabled={isDeleting}
				className={className}
				onClick={handleDelete}
			>
				{isDeleting ? (
					<Loader2 className="w-4 h-4 animate-spin" />
				) : (
					showIcon && <Trash2 className="w-4 h-4" />
				)}
				{label && <span>{isDeleting ? "Deleting..." : label}</span>}
			</Button>
		);
	}

	// ==========================================================================
	// WITH CONFIRMATION
	// ==========================================================================

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>{triggerButton}</AlertDialogTrigger>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{confirmTitle || `Delete ${entity.slice(0, -1)}?`}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{confirmDescription ||
							"This action cannot be undone. This will permanently delete this record."}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>
						{cancelText}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isDeleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isDeleting ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Deleting...
							</>
						) : (
							confirmText
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
