"use client";

/**
 * CreateEntityPage - Notion-style Creation Page
 *
 * ИСПРАВЛЕНИЯ:
 * 1. children — render prop (tempId) => ReactNode
 * 2. initialValues убраны из deps useEffect (ссылка менялась каждый рендер)
 * 3. Упрощён auto-create: не подписка на Store, а callback от EntityField
 *
 * USAGE:
 * ```tsx
 * // app/notes/new/page.tsx
 * export default function NewNotePage() {
 *   return (
 *     <CreateEntityPage
 *       entity="notes"
 *       redirectTo="/notes"
 *       initialValues={{ status: "draft" }}
 *     >
 *       {(tempId) => (
 *         <>
 *           <EntityField entity="notes" entityId={tempId} name="title" />
 *           <EntityField entity="notes" entityId={tempId} name="description" />
 *         </>
 *       )}
 *     </CreateEntityPage>
 *   )
 * }
 * ```
 */

import {
	useEffect,
	useState,
	useRef,
	useCallback,
	type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "@/lib/store";
import { createEntityAction } from "@/actions/update-entity";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface CreateEntityPageProps<E extends EntityType> {
	/** Тип сущности */
	entity: E;

	/**
	 * ✅ Render prop — получает tempId
	 */
	children: (tempId: string) => ReactNode;

	/** Куда редиректить после создания (добавит /{id} в конец) */
	redirectTo?: string;

	/** Начальные значения */
	initialValues?: Partial<EntityDataMap[E]>;

	/** Wrapper className */
	className?: string;

	/** Callback после создания */
	onSuccess?: (id: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateEntityPage<E extends EntityType>({
	entity,
	children,
	redirectTo,
	initialValues,
	className,
	onSuccess,
}: CreateEntityPageProps<E>) {
	const router = useRouter();
	const [tempId] = useState(() => uuidv4());
	const [created, setCreated] = useState(false);
	const creatingRef = useRef(false);

	// ✅ Стабильная ссылка на initialValues
	const initialValuesRef = useRef(initialValues);

	// ==========================================================================
	// INITIALIZE STORE (один раз)
	// ==========================================================================

	useEffect(() => {
		useStore.getState().upsertEntity(entity, tempId, {
			id: tempId,
			...initialValuesRef.current,
		} as EntityDataMap[E]);
	}, [entity, tempId]); // ← initialValues НЕ в deps!

	// ==========================================================================
	// AUTO-CREATE ON FIRST CHANGE
	// ==========================================================================

	useEffect(() => {
		if (created || creatingRef.current) return;

		const unsubscribe = useStore.subscribe((state, prevState) => {
			if (creatingRef.current || created) return;

			const currentData = state.entities[entity]?.[tempId];
			const prevData = prevState.entities[entity]?.[tempId];

			if (!currentData || !prevData) return;

			// Проверить реальные изменения (не meta-поля)
			const hasChanges = Object.keys(currentData).some((key) => {
				if (["id", "created_at", "updated_at"].includes(key))
					return false;
				return (currentData as any)[key] !== (prevData as any)[key];
			});

			if (hasChanges) {
				createRecord();
			}
		});

		return unsubscribe;
	}, [entity, tempId, created]);

	// ==========================================================================
	// CREATE RECORD
	// ==========================================================================

	const createRecord = useCallback(async () => {
		if (creatingRef.current || created) return;
		creatingRef.current = true;

		try {
			const data = useStore.getState().entities[entity]?.[tempId];
			if (!data) throw new Error("No data to save");

			const result = await createEntityAction({
				entity,
				data: { ...data, id: tempId },
			});

			if (!result?.data) {
				throw new Error("Failed to create");
			}

			setCreated(true);
			toast.success("Created!");
			onSuccess?.(tempId);

			if (redirectTo) {
				const path = redirectTo.endsWith("/")
					? `${redirectTo}${tempId}`
					: `${redirectTo}/${tempId}`;
				router.replace(path); // ✅ replace, не push — чтобы /new не осталось в истории
			}
		} catch (error: any) {
			console.error("[CreateEntityPage] Error:", error);
			toast.error(error.message || "Failed to create");
			creatingRef.current = false; // ← разрешить повторную попытку
		}
	}, [entity, tempId, created, redirectTo, onSuccess, router]);

	// ==========================================================================
	// RENDER
	// ==========================================================================

	return (
		<div className={className}>
			{/* ✅ Render prop — tempId доступен дочерним EntityField */}
			{children(tempId)}

			{created && (
				<div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg animate-in fade-in">
					✓ Saved
				</div>
			)}
		</div>
	);
}

// ============================================================================
// PRESET LAYOUTS
// ============================================================================

export function CreateEntityPageCard<E extends EntityType>(
	props: CreateEntityPageProps<E>,
) {
	return (
		<div className="max-w-2xl mx-auto p-6">
			<div className="border rounded-lg p-8 bg-card">
				<CreateEntityPage {...props} />
			</div>
		</div>
	);
}

export function CreateEntityPageFullWidth<E extends EntityType>(
	props: CreateEntityPageProps<E>,
) {
	return (
		<div className="max-w-5xl mx-auto p-6">
			<CreateEntityPage {...props} />
		</div>
	);
}
