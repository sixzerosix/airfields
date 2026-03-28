"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStore, selectEntity } from "@/lib/store";
import { subscribeToEntity } from "@/lib/supabase/realtime";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EntityEditorProps<E extends EntityType> {
	entity: E;
	entityId: string;
	initialData?: EntityDataMap[E];
	children: ReactNode | ((data: EntityDataMap[E]) => ReactNode);
	className?: string;
	loading?: ReactNode;
	error?: ReactNode;
	enableRealtime?: boolean;
	onDeleted?: () => void;
	redirectOnDelete?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EntityEditor<E extends EntityType>({
	entity,
	entityId,
	initialData,
	children,
	className,
	loading,
	error,
	enableRealtime = true,
	onDeleted,
	redirectOnDelete,
}: EntityEditorProps<E>) {
	const router = useRouter();

	// ==========================================================================
	// STORE INITIALIZATION
	// ==========================================================================

	const initialized = useRef(false);

	useEffect(() => {
		if (!initialized.current && initialData) {
			useStore.getState().upsertEntity(entity, entityId, initialData);
			initialized.current = true;
		}
	}, [entity, entityId, initialData]);

	// ==========================================================================
	// STORE SUBSCRIPTION
	// ==========================================================================

	const data = useStore((state) => selectEntity(state, entity, entityId));

	// ==========================================================================
	// REAL-TIME SUBSCRIPTION
	// ==========================================================================

	useEffect(() => {
		if (!enableRealtime) return;

		const unsubscribe = subscribeToEntity(entity, {
			column: "id",
			value: entityId,
		});

		return () => unsubscribe();
	}, [entity, entityId, enableRealtime]);

	// ==========================================================================
	// ✅ DETECT DELETION (cross-tab через realtime)
	// ==========================================================================
	//
	// КЛЮЧЕВОЙ МОМЕНТ: используем отдельный ref wasDataPresent.
	// Он ставится в true ТОЛЬКО когда data реально приходит из useStore.
	// Это решает race condition:
	//   - initialized.current = true ставится в useEffect
	//   - но data из useStore обновляется только при СЛЕДУЮЩЕМ рендере
	//   - если проверять initialized → false positive на первом рендере
	//   - если проверять wasDataPresent → гарантия что data БЫЛО и ИСЧЕЗЛО

	const wasDataPresent = useRef(false);

	useEffect(() => {
		if (data) {
			// Данные ЕСТЬ в Store — запоминаем
			wasDataPresent.current = true;
			return;
		}

		// Данные НЕТ — но были ли они раньше?
		if (!wasDataPresent.current) {
			// Никогда не было data → это первичная загрузка, НЕ удаление
			return;
		}

		// ✅ Данные БЫЛИ и ПРОПАЛИ → удалены через realtime
		console.log(`[EntityEditor] ${entity}:${entityId} was deleted`);

		if (onDeleted) {
			onDeleted();
		} else if (redirectOnDelete) {
			toast.info("This record was deleted");
			router.push(redirectOnDelete);
		}
	}, [data, entity, entityId, onDeleted, redirectOnDelete, router]);

	// ==========================================================================
	// RENDER
	// ==========================================================================

	const displayData = data ?? initialData;

	if (!displayData) {
		if (loading) return <>{loading}</>;

		return (
			<div className="p-6 text-center text-muted-foreground">
				Loading...
			</div>
		);
	}

	return (
		<div className={cn(className, "group")}>
			{typeof children === "function" ? children(displayData) : children}
		</div>
	);
}

// ============================================================================
// PRESETS
// ============================================================================

export function EntityEditorCard<E extends EntityType>(
	props: EntityEditorProps<E>,
) {
	return (
		<div className="max-w-2xl mx-auto p-6">
			<div className="border rounded-lg p-8 bg-card">
				<EntityEditor {...props} />
			</div>
		</div>
	);
}

export function EntityEditorFullWidth<E extends EntityType>(
	props: EntityEditorProps<E>,
) {
	return (
		<div className="max-w-5xl mx-auto p-6">
			<EntityEditor {...props} />
		</div>
	);
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Simple Note Editor
 *
 * ```tsx
 * <EntityEditor entity="notes" entityId={id} initialData={note}>
 *   <EntityField name="title" />
 *   <EntityField name="description" />
 *   <EntityField name="status" />
 * </EntityEditor>
 * ```
 */

/**
 * Example 2: Partial Editing (только статус на дашборде)
 *
 * ```tsx
 * <EntityEditor entity="notes" entityId={id} initialData={note}>
 *   {(note) => (
 *     <div>
 *       <h3 className="font-bold">{note.title}</h3>
 *       <p className="text-muted-foreground">{note.description}</p>
 *
 *        Только статус editable
 *       <EntityField name="status" />
 *     </div>
 *   )}
 * </EntityEditor>
 * ```
 */

/**
 * Example 3: Custom Layout with Metadata
 *
 * ```tsx
 * <EntityEditor entity="tasks" entityId={id} initialData={task}>
 *   {(task) => (
 *     <>
 *       <div className="mb-6">
 *         <h1 className="text-3xl font-bold">{task.title}</h1>
 *         <p className="text-sm text-muted-foreground">
 *           Created {new Date(task.created_at).toLocaleString()}
 *         </p>
 *       </div>
 *
 *       <EntityField name="title" />
 *       <EntityField name="description" />
 *
 *       <div className="grid grid-cols-2 gap-4">
 *         <EntityField name="priority" />
 *         <EntityField name="due_date" />
 *       </div>
 *
 *       <EntityField name="status" />
 *     </>
 *   )}
 * </EntityEditor>
 * ```
 */
