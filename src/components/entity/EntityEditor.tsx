"use client";

/**
 * EntityEditor - Universal Editor Wrapper
 *
 * Универсальная обёртка для редактирования любой сущности.
 * Управляет:
 * - Инициализацией Store
 * - Real-time подписками
 * - Загрузкой данных
 *
 * USAGE:
 * ```tsx
 * // Simple - ReactNode children
 * <EntityEditor entity="notes" entityId={noteId} initialData={note}>
 *   <EntityField name="title" />
 *   <EntityField name="description" />
 * </EntityEditor>
 *
 * // Advanced - Render prop для кастомизации
 * <EntityEditor entity="notes" entityId={noteId} initialData={note}>
 *   {(note) => (
 *     <>
 *       <h1>{note.title}</h1>
 *       <EntityField name="title" />
 *       <EntityField name="description" />
 *       <p className="text-sm">Updated: {note.updated_at}</p>
 *     </>
 *   )}
 * </EntityEditor>
 * ```
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useStore, selectEntity } from "@/lib/store";
import { subscribeToEntity } from "@/lib/supabase/realtime";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface EntityEditorProps<E extends EntityType> {
	/** Тип сущности */
	entity: E;

	/** ID сущности */
	entityId: string;

	/** Начальные данные (опционально, если уже есть в Store) */
	initialData?: EntityDataMap[E];

	/**
	 * Children - может быть:
	 * - ReactNode (простые EntityField компоненты)
	 * - Function (render prop с данными из Store для кастомизации)
	 *
	 * @example
	 * // ReactNode
	 * <EntityField name="title" />
	 *
	 * @example
	 * // Render prop
	 * {(note) => (
	 *   <>
	 *     <h1>{note.title}</h1>
	 *     <EntityField name="title" />
	 *   </>
	 * )}
	 */
	children: ReactNode | ((data: EntityDataMap[E]) => ReactNode);

	/** Wrapper className */
	className?: string;

	/** Loading fallback */
	loading?: ReactNode;

	/** Error fallback */
	error?: ReactNode;

	/**
	 * Подписываться ли на real-time?
	 * @default true
	 */
	enableRealtime?: boolean;
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
}: EntityEditorProps<E>) {
	// ==========================================================================
	// STORE INITIALIZATION
	// ==========================================================================

	// ✅ Синхронная инициализация как в твоей старой версии (работает!)
	const initialized = useRef(false);

	if (!initialized.current && initialData) {
		// Поместить данные из сервера в store СИНХРОННО
		useStore.getState().upsertEntity(entity, entityId, initialData);
		initialized.current = true;
	}

	// ==========================================================================
	// STORE SUBSCRIPTION
	// ==========================================================================

	// Подписка на обновления из Store
	const data = useStore((state) => selectEntity(state, entity, entityId));

	// ==========================================================================
	// REAL-TIME SUBSCRIPTION
	// ==========================================================================

	useEffect(() => {
		if (!enableRealtime) return;

		console.log(
			`[EntityEditor] Setting up real-time for ${entity}:${entityId}`,
		);

		const unsubscribe = subscribeToEntity(entity, {
			column: "id",
			value: entityId,
		});

		return () => {
			console.log(
				`[EntityEditor] Cleaning up real-time for ${entity}:${entityId}`,
			);
			unsubscribe();
		};
	}, [entity, entityId, enableRealtime]);

	// ==========================================================================
	// FALLBACKS
	// ==========================================================================

	if (!data) {
		if (loading) return <>{loading}</>;

		return (
			<div className="p-6 text-center text-muted-foreground">
				Loading...
			</div>
		);
	}

	// ==========================================================================
	// RENDER
	// ==========================================================================

	return (
		<div className={className}>
			{/* ✅ RENDER PROP PATTERN - главное улучшение! */}
			{typeof children === "function" ? children(data) : children}
		</div>
	);
}

// ============================================================================
// PRESET LAYOUTS
// ============================================================================

/**
 * EntityEditorCard - С Card обёрткой
 */
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

/**
 * EntityEditorFullWidth - На всю ширину
 */
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
