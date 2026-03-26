/**
 * EntityPage - Universal Server Component Wrapper
 *
 * Универсальная обёртка для загрузки данных сущности на сервере.
 *
 * USAGE:
 * ```tsx
 * // app/notes/[id]/page.tsx
 * export default async function NotePage({ params }) {
 *   return (
 *     <EntityPage entity="notes" params={params}>
 *       {(data) => (
 *         <EntityEditor entity="notes" entityId={data.id}>
 *           <EntityField name="title" />
 *         </EntityEditor>
 *       )}
 *     </EntityPage>
 *   )
 * }
 * ```
 */

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import type { ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface EntityPageProps<E extends EntityType> {
	/** Тип сущности */
	entity: E;

	/** Next.js params (async в Next.js 15+) */
	params: Promise<{ id: string }>;

	/** Render function с данными */
	children: (data: EntityDataMap[E]) => ReactNode;

	/** Дополнительные поля для select (кроме *) */
	select?: string;

	/** Custom error fallback */
	errorFallback?: ReactNode;

	/** Custom not found fallback */
	notFoundFallback?: ReactNode;

	/** Требовать авторизацию? */
	requireAuth?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export async function EntityPage<E extends EntityType>({
	entity,
	params,
	children,
	select = "*",
	errorFallback,
	notFoundFallback,
	requireAuth = true,
}: EntityPageProps<E>) {
	// ==========================================================================
	// SUPABASE CLIENT
	// ==========================================================================

	const supabase = await createServerSupabaseClient();

	// ==========================================================================
	// AUTH CHECK
	// ==========================================================================

	if (requireAuth) {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return (
				<div className="p-10 text-center">
					<p className="text-muted-foreground">
						Please sign in to view this content
					</p>
				</div>
			);
		}
	}

	// ==========================================================================
	// RESOLVE PARAMS
	// ==========================================================================

	const { id } = await params;

	// ==========================================================================
	// FETCH DATA
	// ==========================================================================

	const { data, error } = await supabase
		.from(entity)
		.select(select)
		.eq("id", id)
		.single();

	// ==========================================================================
	// ERROR HANDLING
	// ==========================================================================

	if (error) {
		// .single() возвращает ошибку когда 0 строк — это не ошибка, это "not found"
		if (error.code === "PGRST116") {
			if (notFoundFallback) return <>{notFoundFallback}</>;
			return notFound();
		}

		console.error(`[EntityPage] Error loading ${entity}:${id}`, error);

		console.error(`[EntityPage] Error loading ${entity}:${id}`, error);

		if (errorFallback) {
			return <>{errorFallback}</>;
		}

		return (
			<div className="p-6 text-center">
				<p className="text-destructive">Failed to load {entity}</p>
				<p className="text-sm text-muted-foreground mt-2">
					{error.message}
				</p>
			</div>
		);
	}

	if (!data) {
		if (notFoundFallback) {
			return <>{notFoundFallback}</>;
		}

		return notFound();
	}

	// ==========================================================================
	// RENDER
	// ==========================================================================

	return <>{children(data as unknown as EntityDataMap[E])}</>;
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * EntityPageSimple - Простая загрузка БЕЗ auth check
 */
export async function EntityPageSimple<E extends EntityType>(
	props: Omit<EntityPageProps<E>, "requireAuth">,
) {
	return <EntityPage {...props} requireAuth={false} />;
}
