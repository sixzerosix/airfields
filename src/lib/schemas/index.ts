// lib/schemas.ts
import { z } from 'zod'

// ======================
// 1. Тип сущностей
// ======================
export const SUPPORTED_ENTITIES = ['notes', 'tasks', 'projects'] as const
export type EntityType = typeof SUPPORTED_ENTITIES[number]

// ======================
// 2. Типы данных каждой сущности
// ======================
export type EntityDataMap = {
	notes: {
		id: string
		title: string
		description: string | null
		status: 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
		created_at: string
		updated_at: string
	}
	tasks: {
		id: string
		title: string
		description: string | null
		status: 'todo' | 'in_progress' | 'done' | 'archived'
		priority?: 'low' | 'medium' | 'high' | 'urgent'
		due_date?: string | null
		created_at: string
		updated_at: string
	}
	projects: {
		id: string
		name: string
		description: string | null
		status: 'active' | 'paused' | 'completed' | 'archived'
		created_at: string
		updated_at: string
	}
}

// ======================
// 3. Zod-схемы для полей (Field-level validation)
// ======================
export const FieldSchemas = {
	notes: {
		title: z.string().min(1, 'Заголовок обязателен').max(200),
		description: z.string().max(5000, 'Слишком длинное описание').nullable().optional(),
		status: z.enum(['todo', 'in_progress', 'review', 'done', 'archived'])
	},
	tasks: {
		title: z.string().min(1, 'Title is required').max(200),
		description: z.string().max(5000).nullable().optional(),
		status: z.enum(['todo', 'in_progress', 'done', 'archived']),
		priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().nullable(),
	},
	projects: {
		name: z.string().min(1, 'Name is required').max(100),
		description: z.string().max(2000).nullable().optional(),
	},
} as const

// ============================================================================
// УТИЛИТЫ ДЛЯ ВАЛИДАЦИИ
// ============================================================================

export function getFieldSchema<E extends EntityType>(
	entity: E,
	field: string   // оставляем string для удобства
): z.ZodTypeAny {
	const entitySchemas = FieldSchemas[entity];

	if (!entitySchemas) {
		console.warn(`[schemas] No schemas defined for entity: ${entity}`);
		return z.any();
	}

	// Безопасное приведение
	if (field in entitySchemas) {
		return (entitySchemas as any)[field];
	}

	console.warn(`[schemas] Field "${field}" not found in ${entity}`);
	return z.any();
}

/**
 * Валидировать значение поля
 */
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

/**
 * Экспорт отдельных типов для удобства
 */
export type Note = EntityDataMap['notes']
export type Task = EntityDataMap['tasks']
export type Project = EntityDataMap['projects']