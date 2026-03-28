import { z } from 'zod'

// ======================
// 1. Тип сущностей
// ======================
export const SUPPORTED_ENTITIES = ['notes'] as const
export type EntityType = typeof SUPPORTED_ENTITIES[number]

// ======================
// 2. Типы данных
// ======================
export type EntityDataMap = {
	notes: {
		id: string
		position: string
		title: string
		description: string | null
		status: 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
		category_id: string | null
		tags: string[]
		is_favorite: boolean
		created_at: string
		updated_at: string
	}
}

// ======================
// 3. Zod-схемы для полей
// ======================
export const FieldSchemas = {
	notes: {
		position: z.string().optional(),
		title: z.string().min(1, 'Заголовок обязателен').max(200),
		description: z.string().max(5000, 'Слишком длинное описание').nullable().optional(),
		status: z.enum(['todo', 'in_progress', 'review', 'done', 'archived']),
		category_id: z.uuid().nullable().optional(),
		tags: z.array(z.string()).optional(),
		is_favorite: z.boolean(),
	},
} as const

// ============================================================================
// УТИЛИТЫ
// ============================================================================

export function getFieldSchema<E extends EntityType>(
	entity: E,
	field: string
): z.ZodTypeAny {
	const entitySchemas = FieldSchemas[entity];

	if (!entitySchemas) {
		console.warn(`[schemas] No schemas defined for entity: ${entity}`);
		return z.any();
	}

	if (field in entitySchemas) {
		return (entitySchemas as any)[field];
	}

	console.warn(`[schemas] Field "${field}" not found in ${entity}`);
	return z.any();
}

export function validateField<E extends EntityType>(
	entity: E,
	field: keyof EntityDataMap[E],
	value: any
): { success: boolean; error?: string } {
	try {
		const schema = getFieldSchema(entity, field as string)
		schema.parse(value)
		return { success: true }
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: error.issues[0]?.message || 'Validation failed',
			}
		}
		return { success: false, error: 'Unknown validation error' }
	}
}

// ============================================================================
// ЭКСПОРТ ТИПОВ
// ============================================================================


export type Note = EntityDataMap['notes']