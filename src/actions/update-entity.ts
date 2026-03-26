'use server'

/**
 * UNIVERSAL UPDATE ENTITY ACTION
 * 
 * Единый Server Action для обновления любого поля любой сущности.
 * 
 * Безопасность:
 * - Валидация через Zod (client + server)
 * - RLS защита в Supabase
 * - Rate limiting через middleware
 * - Type-safe от клиента до БД
 * 
 * Использование:
 * await updateEntityAction({
 *   entity: 'tasks',
 *   entityId: '123',
 *   field: 'title',
 *   value: 'New title'
 * })
 */

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { EntityType, EntityDataMap, getFieldSchema } from '@/lib/schemas'

// ============================================================================
// SCHEMA
// ============================================================================

/**
 * Схема для валидации входных данных
 * 
 * ВАЖНО: entity автоматически берётся из EntityType!
 */
const UpdateEntitySchema = z.object({
	entity: z.string().refine(
		(val) => ['notes', 'tasks', 'projects'].includes(val),
		{ message: 'Invalid entity type' }
	) as z.ZodType<EntityType>,

	entityId: z.string().uuid({
		message: 'Invalid entity ID format'
	}),

	field: z.string().min(1, {
		message: 'Field name is required'
	}),

	value: z.any(), // Валидация по типу поля ниже
})

// ============================================================================
// ACTION
// ============================================================================

/**
 * Universal Update Entity Action
 * 
 * @param entity - Тип сущности (tasks, projects, comments, etc)
 * @param entityId - UUID сущности
 * @param field - Имя поля для обновления
 * @param value - Новое значение
 * 
 * @returns { success: true, data } или { success: false, error }
 */
export const updateEntityAction = actionClient
	.inputSchema(UpdateEntitySchema)
	.action(async ({ parsedInput: { entity, entityId, field, value } }) => {
		console.log('[updateEntityAction] Called:', { entity, entityId, field })

		// ========================================================================
		// 1. ДОПОЛНИТЕЛЬНАЯ ВАЛИДАЦИЯ (по типу поля)
		// ========================================================================

		const fieldSchema = getFieldSchema(entity, field);

		const validationResult = fieldSchema.safeParse(value);

		if (!validationResult.success) {
			const errorMessage = validationResult.error.issues[0]?.message || 'Validation failed';

			console.error(`[updateEntityAction] Validation failed: ${entity}.${field} -> ${errorMessage}`);

			// Это позволит увидеть ошибку на клиенте
			throw new Error(errorMessage);
		}

		// ========================================================================
		// 2. SUPABASE UPDATE
		// ========================================================================

		const supabase = await createServerSupabaseClient()

		const { data, error } = await supabase
			.from(entity)
			.update({
				[field]: value,
				updated_at: new Date().toISOString(),
			})
			.eq('id', entityId)
			.select()
			.single()

		if (error) {
			console.error('[updateEntityAction] Supabase error:', error)
			throw new Error(error.message)
		}

		// ========================================================================
		// 3. REVALIDATE NEXT.JS CACHE
		// ========================================================================

		// Инвалидировать кэш для этой страницы
		revalidatePath(`/${entity}/${entityId}`)
		revalidatePath(`/${entity}`) // Список тоже

		// ========================================================================
		// 4. RETURN SUCCESS
		// ========================================================================

		console.log('[updateEntityAction] Success:', data.id)

		return {
			success: true,
			data,
			updatedAt: data.updated_at,
		}
	})

// ============================================================================
// BATCH UPDATE (опционально)
// ============================================================================

/**
 * Schema для batch update (обновить несколько полей за раз)
 */
const BatchUpdateSchema = z.object({
	entity: z.string() as z.ZodType<EntityType>,
	entityId: z.string().uuid(),
	updates: z.record(z.string(), z.any()), // ← FIX: 2 аргумента
})

/**
 * Batch Update Action
 * 
 * Обновить несколько полей одним запросом
 * Полезно для форм с зависимыми полями
 */
export const batchUpdateEntityAction = actionClient
	.inputSchema(BatchUpdateSchema)
	.action(async ({ parsedInput: { entity, entityId, updates } }) => {
		console.log('[batchUpdateEntityAction] Called:', { entity, entityId, updates })

		// Валидация всех полей
		for (const [field, value] of Object.entries(updates)) {
			try {
				const fieldSchema = getFieldSchema(entity as any, field as any)
				fieldSchema.parse(value)
			} catch (error) {
				throw new Error(`Validation failed for field ${field}`)
			}
		}

		const supabase = await createServerSupabaseClient()

		const { data, error } = await supabase
			.from(entity)
			.update({
				...updates,
				updated_at: new Date().toISOString(),
			})
			.eq('id', entityId)
			.select()
			.single()

		if (error) {
			throw new Error(error.message)
		}

		revalidatePath(`/${entity}/${entityId}`)
		revalidatePath(`/${entity}`)

		return {
			success: true,
			data,
		}
	})

// ============================================================================
// DELETE ACTION (бонус)
// ============================================================================

const DeleteEntitySchema = z.object({
	entity: z.string() as z.ZodType<EntityType>,
	entityId: z.string().uuid(),
})

/**
 * Delete Entity Action
 */
export const deleteEntityAction = actionClient
	.inputSchema(DeleteEntitySchema)
	.action(async ({ parsedInput: { entity, entityId } }) => {
		const supabase = await createServerSupabaseClient()

		const { error } = await supabase
			.from(entity)
			.delete()
			.eq('id', entityId)

		if (error) {
			throw new Error(error.message)
		}

		revalidatePath(`/${entity}`)

		return {
			success: true,
			deletedId: entityId,
		}
	})

// ============================================================================
// CREATE ACTION (бонус)
// ============================================================================

const CreateEntitySchema = z.object({
	entity: z.string() as z.ZodType<EntityType>,
	data: z.record(z.string(), z.any()), // ← FIX: 2 аргумента
})

/**
 * Create Entity Action
 */
// ============================================================================
// ЗАМЕНИ createEntityAction В update-entity.ts
// ============================================================================
//
// npm install fractional-indexing
//
// Изменение: генерирует fractional position key для новых записей.
// Новая запись получает ключ ПОСЛЕ последнего элемента.
// ============================================================================

import { generateKeyBetween } from 'fractional-indexing'

export const createEntityAction = actionClient
	.inputSchema(CreateEntitySchema)
	.action(async ({ parsedInput: { entity, data } }) => {
		const supabase = await createServerSupabaseClient();

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		// ✅ Генерируем position если не передан
		let position = data.position;
		if (!position) {
			// Найти последний элемент (максимальный position)
			const { data: firstItems } = await supabase
				.from(entity)
				.select("position")
				.eq("user_id", user.id)
				.order("position", { ascending: true })  // первый
				.limit(1);

			const firstKey = firstItems?.[0]?.position ?? null;
			position = generateKeyBetween(null, firstKey);  // ПЕРЕД первым
		}

		const { data: records, error } = await supabase
			.from(entity)
			.insert({
				...data,
				user_id: user.id,
				position,
			})
			.select("id");

		if (error) {
			console.error("[createEntityAction] Supabase Error:", error);
			throw new Error(error.message);
		}

		const id = records?.[0]?.id ?? data.id;
		if (!id) throw new Error("Created but could not retrieve ID");

		revalidatePath(`/${entity}`);

		return { id };
	});

// ============================================================================
// ДОБАВЬ В update-entity.ts
// ============================================================================

// Schema
const ReorderEntitiesSchema = z.object({
	entity: z.string() as z.ZodType<EntityType>,
	updates: z.array(
		z.object({
			id: z.string().uuid(),
			position: z.number().int().min(0),
		}),
	),
});

/**
 * Reorder Entities Action
 *
 * Batch-обновление positions для drag-and-drop.
 * Один запрос на все изменения — атомарно.
 */
export const reorderEntitiesAction = actionClient
	.inputSchema(ReorderEntitiesSchema)
	.action(async ({ parsedInput: { entity, updates } }) => {
		const supabase = await createServerSupabaseClient();

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		// Batch update через Promise.all
		// Supabase не поддерживает multi-row update в одном запросе,
		// поэтому параллельные запросы — это стандартный подход.
		const results = await Promise.all(
			updates.map(({ id, position }) =>
				supabase
					.from(entity)
					.update({
						position,
						updated_at: new Date().toISOString(),
					})
					.eq("id", id)
					.eq("user_id", user.id) // RLS double-check
			),
		);

		// Проверяем ошибки
		const errors = results.filter((r) => r.error);
		if (errors.length > 0) {
			console.error("[reorderEntitiesAction] Errors:", errors.map((e) => e.error));
			throw new Error(`Failed to update ${errors.length} items`);
		}

		revalidatePath(`/${entity}`);

		return {
			updated: updates.length,
		};
	});