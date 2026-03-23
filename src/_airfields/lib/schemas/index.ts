import { z, ZodError } from 'zod' // ← Добавьте ZodError в импорт

// ============================================================================
// БАЗОВЫЕ СХЕМЫ
// ============================================================================

/**
 * Схема для задачи
 * Единый источник правил валидации для всех полей задачи
 */
export const TaskSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
	description: z.string().max(5000, 'Description too long').optional().nullable(),
	status: z.enum(['todo', 'in_progress', 'done', 'archived']),
	priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().nullable(),
	due_date: z.string().datetime().optional().nullable(),

	// NEW: Foreign Key
	project_id: z.string().uuid().optional().nullable(),

	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
})

export type Task = z.infer<typeof TaskSchema>

/**
 * Схема для проекта
 */
export const ProjectSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
	description: z.string().max(2000, 'Description too long').optional().nullable(),
	status: z.enum(['active', 'paused', 'completed', 'archived']),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
})

export type Project = z.infer<typeof ProjectSchema>

// ============================================================================
// СХЕМЫ ДЛЯ ПОЛЕЙ (Field-level validation)
// ============================================================================

/**
 * Схемы для отдельных полей
 * Используются для валидации на уровне поля, без полной схемы
 */
export const FieldSchemas = {
	tasks: {
		title: TaskSchema.shape.title,
		description: TaskSchema.shape.description,
		status: TaskSchema.shape.status,
		priority: TaskSchema.shape.priority,
		due_date: TaskSchema.shape.due_date,
		project_id: TaskSchema.shape.project_id,
	},
	projects: {
		name: ProjectSchema.shape.name,
		description: ProjectSchema.shape.description,
		status: ProjectSchema.shape.status,
	},
} as const

// ============================================================================
// ТИПЫ ДЛЯ СУЩНОСТЕЙ
// ============================================================================

export type EntityType = 'tasks' | 'projects'

export type EntitySchemaMap = {
	tasks: typeof TaskSchema
	projects: typeof ProjectSchema
}

export type EntityDataMap = {
	tasks: Task
	projects: Project
}

// ============================================================================
// УТИЛИТЫ ДЛЯ ВАЛИДАЦИИ
// ============================================================================

/**
 * Получить схему для конкретного поля
 */
export function getFieldSchema<E extends EntityType>(
	entity: E,
	field: keyof EntityDataMap[E]
): z.ZodTypeAny {
	const schemas = FieldSchemas[entity] as any
	return schemas[field] || z.any()
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
		const schema = getFieldSchema(entity, field)
		schema.parse(value)
		return { success: true }
	} catch (error) {
		// Use ZodError.format() or .issues for better type safety
		if (error instanceof ZodError) {
			return {
				success: false,
				// .issues is the preferred property for accessing the error array
				error: error.issues[0]?.message || 'Validation failed',
			}
		}
		return { success: false, error: 'Unknown validation error' }
	}
}