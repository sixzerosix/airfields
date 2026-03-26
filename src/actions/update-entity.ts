'use server'

/**
 * UNIVERSAL ENTITY ACTIONS
 *
 * Server Actions для CRUD операций с любой сущностью.
 *
 * - updateEntityAction     — обновить одно поле
 * - batchUpdateEntityAction — обновить несколько полей
 * - createEntityAction      — создать запись + M2M связи (generic)
 * - deleteEntityAction      — удалить запись
 */

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateKeyBetween } from 'fractional-indexing'
import {
	EntityType,
	EntityDataMap,
	getFieldSchema,
	SUPPORTED_ENTITIES,
} from '@/lib/schemas'

// ============================================================================
// UPDATE (одно поле)
// ============================================================================

const UpdateEntitySchema = z.object({
	entity: z.string().refine(
		(val) => (SUPPORTED_ENTITIES as readonly string[]).includes(val),
		{ message: 'Invalid entity type' }
	) as z.ZodType<EntityType>,

	entityId: z.string().uuid({
		message: 'Invalid entity ID format',
	}),

	field: z.string().min(1, {
		message: 'Field name is required',
	}),

	value: z.any(),
})

export const updateEntityAction = actionClient
	.inputSchema(UpdateEntitySchema)
	.action(async ({ parsedInput: { entity, entityId, field, value } }) => {
		console.log('[updateEntityAction] Called:', { entity, entityId, field })

		// Валидация по типу поля
		const fieldSchema = getFieldSchema(entity, field)
		const validationResult = fieldSchema.safeParse(value)

		if (!validationResult.success) {
			const errorMessage =
				validationResult.error.issues[0]?.message || 'Validation failed'
			console.error(
				`[updateEntityAction] Validation failed: ${entity}.${field} -> ${errorMessage}`,
			)
			throw new Error(errorMessage)
		}

		// Supabase update
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

		revalidatePath(`/${entity}/${entityId}`)
		revalidatePath(`/${entity}`)

		console.log('[updateEntityAction] Success:', data.id)

		return {
			success: true,
			data,
			updatedAt: data.updated_at,
		}
	})

// ============================================================================
// BATCH UPDATE (несколько полей за раз)
// ============================================================================

const BatchUpdateSchema = z.object({
	entity: z.string() as z.ZodType<EntityType>,
	entityId: z.string().uuid(),
	updates: z.record(z.string(), z.any()),
})

export const batchUpdateEntityAction = actionClient
	.inputSchema(BatchUpdateSchema)
	.action(async ({ parsedInput: { entity, entityId, updates } }) => {
		console.log('[batchUpdateEntityAction] Called:', {
			entity,
			entityId,
			updates,
		})

		// Валидация всех полей
		for (const [field, value] of Object.entries(updates)) {
			try {
				const fieldSchema = getFieldSchema(entity, field)
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
// DELETE
// ============================================================================

const DeleteEntitySchema = z.object({
	entity: z.string() as z.ZodType<EntityType>,
	entityId: z.string().uuid(),
})

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
// CREATE (с generic M2M relations)
// ============================================================================

/**
 * Generic M2M relation для server action.
 * useEntityDraft автоматически формирует из registry.
 */
const RelationInsertSchema = z.object({
	/** Junction table (entity_tags, note_collaborators, etc.) */
	junctionTable: z.string(),
	/** FK column name (tag_id, user_id, etc.) */
	foreignKey: z.string(),
	/** IDs для вставки */
	ids: z.array(z.string()),
	/** Полиморфная связь? (entity_type + entity_id) */
	polymorphic: z.boolean(),
	/** FK на основную сущность (для НЕ полиморфных) */
	entityKey: z.string().optional(),
})

const CreateEntitySchema = z.object({
	entity: z.string() as z.ZodType<EntityType>,
	data: z.record(z.string(), z.any()),
	/** Generic M2M relations — формируется автоматически из registry */
	relations: z.array(RelationInsertSchema).optional(),
})

export const createEntityAction = actionClient
	.inputSchema(CreateEntitySchema)
	.action(async ({ parsedInput: { entity, data, relations } }) => {
		const supabase = await createServerSupabaseClient()

		const {
			data: { user },
		} = await supabase.auth.getUser()
		if (!user) throw new Error('Not authenticated')

		// ==================================================================
		// 1. POSITION (новые сверху)
		// ==================================================================

		let position = data.position
		if (!position) {
			const { data: firstItems } = await supabase
				.from(entity)
				.select('position')
				.eq('user_id', user.id)
				.order('position', { ascending: true })
				.limit(1)

			const firstKey = firstItems?.[0]?.position ?? null
			position = generateKeyBetween(null, firstKey)
		}

		// ==================================================================
		// 2. CLEAN DATA — убираем виртуальные M2M поля и мета
		// ==================================================================

		const cleanData: Record<string, any> = {}
		for (const [key, value] of Object.entries(data)) {
			// Пропускаем мета-поля
			if (key === 'created_at' || key === 'updated_at') continue
			// Пропускаем виртуальные M2M поля (массивы IDs)
			if (Array.isArray(value)) continue
			cleanData[key] = value
		}

		// ==================================================================
		// 3. INSERT основную запись
		// ==================================================================

		const { data: records, error } = await supabase
			.from(entity)
			.insert({
				...cleanData,
				user_id: user.id,
				position,
			})
			.select('id')

		if (error) {
			console.error('[createEntityAction] Insert Error:', error)
			throw new Error(error.message)
		}

		const entityId = records?.[0]?.id ?? data.id
		if (!entityId) throw new Error('Created but could not retrieve ID')

		// ==================================================================
		// 4. INSERT M2M relations (generic)
		// ==================================================================

		if (relations && relations.length > 0) {
			for (const rel of relations) {
				if (!rel.ids || rel.ids.length === 0) continue

				// Формируем записи для junction table
				const rows = rel.ids.map((foreignId) => {
					const row: Record<string, any> = {
						[rel.foreignKey]: foreignId,
						user_id: user.id,
					}

					if (rel.polymorphic) {
						// entity_type + entity_id (наш entity_tags)
						row.entity_type = entity
						row.entity_id = entityId
					} else {
						// Конкретный FK (note_id, task_id)
						row[rel.entityKey || `${entity.slice(0, -1)}_id`] = entityId
					}

					return row
				})

				const { error: relError } = await supabase
					.from(rel.junctionTable)
					.insert(rows)

				if (relError) {
					console.error(
						`[createEntityAction] M2M insert error (${rel.junctionTable}):`,
						relError,
					)

					// Компенсация: удалить основную запись при ошибке M2M
					await supabase.from(entity).delete().eq('id', entityId)

					throw new Error(
						`Failed to create relations in ${rel.junctionTable}: ${relError.message}`,
					)
				}
			}
		}

		// ==================================================================
		// 5. DONE
		// ==================================================================

		revalidatePath(`/${entity}`)

		return { id: entityId }
	})