/**
 * ENTITY REGISTRY
 *
 * Центральный реестр конфигурации полей для всех сущностей.
 * Здесь определяется как каждое поле должно отображаться.
 *
 * При добавлении новой таблицы - добавь её сюда!
 */

import { EditableText } from "@/components/fields/EditableText";
import { EditableTextarea } from "@/components/fields/EditableTextarea";
import { EditableSelect } from "@/components/fields/EditableSelect";
import { EditableDate } from "@/components/fields/EditableDate";
import { ReferencePicker } from "@/components/fields/ReferencePicker";
import { ArrowDown, ArrowRight, ArrowUp, Zap } from "lucide-react";
import type { EntityType } from "./schemas";
import type { ComponentType } from "react";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Конфигурация одного поля
 */
export interface FieldConfig {
	// Компонент для рендера
	component: ComponentType<any>;

	// Label для поля
	label?: string;

	// Placeholder
	placeholder?: string;

	// Дополнительные props для компонента
	props?: Record<string, any>;

	// Save mode (auto | manual | hybrid)
	saveMode?: "auto" | "manual" | "hybrid";

	// Debounce в мс (для auto mode)
	debounceMs?: number;
}

/**
 * Конфигурация всех полей сущности
 */
export interface EntityConfig {
	fields: Record<string, FieldConfig>;
}

/**
 * Весь реестр
 */
export type Registry = {
	[K in EntityType]?: EntityConfig;
};

// ============================================================================
// OPTIONS (опции для Select полей)
// ============================================================================

const PRIORITY_OPTIONS = [
	{
		value: "low",
		label: "Low",
		icon: <ArrowDown className="h-4 w-4 text-blue-500" />,
	},
	{
		value: "medium",
		label: "Medium",
		icon: <ArrowRight className="h-4 w-4 text-yellow-500" />,
	},
	{
		value: "high",
		label: "High",
		icon: <ArrowUp className="h-4 w-4 text-orange-500" />,
	},
	{
		value: "urgent",
		label: "Urgent",
		icon: <Zap className="h-4 w-4 text-red-500" />,
	},
];

const STATUS_OPTIONS = [
	{ value: "todo", label: "To Do" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "done", label: "Done" },
];

// ============================================================================
// REGISTRY
// ============================================================================

export const EntityRegistry: Registry = {
	// ==========================================================================
	// TASKS
	// ==========================================================================
	tasks: {
		fields: {
			title: {
				component: EditableText,
				label: "Task Title",
				placeholder: "Enter task title...",
				saveMode: "auto",
				debounceMs: 500,
			},

			description: {
				component: EditableTextarea,
				label: "Description",
				placeholder: "Add a description...",
				saveMode: "auto",
				debounceMs: 800,
				props: {
					rows: 6,
				},
			},

			status: {
				component: EditableSelect,
				label: "Status",
				saveMode: "auto", // Select сохраняется сразу
				props: {
					options: STATUS_OPTIONS,
				},
			},

			priority: {
				component: EditableSelect,
				label: "Priority",
				saveMode: "auto",
				props: {
					options: PRIORITY_OPTIONS,
				},
			},

			due_date: {
				component: EditableDate,
				label: "Due Date",
				placeholder: "Pick a date...",
				saveMode: "auto",
			},

			// NEW: Foreign Key to Projects
			project_id: {
				component: ReferencePicker,
				label: "Project",
				placeholder: "Select project...",
				saveMode: "auto",
				props: {
					referenceTable: "projects",
					displayField: "name",
					secondaryField: "status",
					allowNull: true,
					nullLabel: "No project",
					orderBy: { field: "name", ascending: true },
				},
			},
		},
	},

	// ==========================================================================
	// PROJECTS (пример для второй таблицы)
	// ==========================================================================
	projects: {
		fields: {
			name: {
				component: EditableText,
				label: "Project Name",
				placeholder: "Enter project name...",
				saveMode: "auto",
			},

			description: {
				component: EditableTextarea,
				label: "Description",
				placeholder: "Describe the project...",
				saveMode: "auto",
				props: {
					rows: 8,
				},
			},
		},
	},

	// ==========================================================================
	// COMMENTS (пример для третьей таблицы)
	// ==========================================================================
	// Раскомментируй когда добавишь таблицу comments:
	/*
  comments: {
    fields: {
      content: {
        component: EditableTextarea,
        label: 'Comment',
        placeholder: 'Write your comment...',
        saveMode: 'manual',  // ← Комментарии лучше сохранять вручную!
        props: {
          rows: 4,
          showSaveButton: true,
        },
      },
    },
  },
  */
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Получить конфигурацию поля
 */
export function getFieldConfig(
	entity: EntityType,
	field: string,
): FieldConfig | undefined {
	return EntityRegistry[entity]?.fields[field];
}

/**
 * Получить все поля сущности
 */
export function getEntityFields(entity: EntityType): string[] {
	const config = EntityRegistry[entity];
	if (!config) return [];

	return Object.keys(config.fields);
}

/**
 * Проверить есть ли конфигурация для поля
 */
export function hasFieldConfig(entity: EntityType, field: string): boolean {
	return !!EntityRegistry[entity]?.fields[field];
}
