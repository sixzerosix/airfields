/**
 * ENTITY REGISTRY
 *
 * Центральный реестр конфигурации полей для всех сущностей.
 * Включает конфигурацию M2M связей — автоматическое определение
 * какие поля хранят relations и как их сохранять.
 */

import { EditableText } from "@/components/fields/EditableText";
import { EditableTextarea } from "@/components/fields/EditableTextarea";
import { EditableSelect } from "@/components/fields/EditableSelect";
import { EditableTags } from "@/components/fields/EditableTags";
import { EditableCombobox } from "@/components/fields/EditableCombobox";
import { EditableToggle } from "@/components/fields/EditableToggle";
import { BookmarkIcon, Star } from "lucide-react";
import type { EntityType } from "./schemas";
import type { ComponentType } from "react";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Конфигурация M2M/12M связи для поля
 */
export interface RelationConfig {
	/** Тип связи */
	type: "m2m";

	/** Junction table (таблица связей) */
	junctionTable: string;

	/** FK в junction table на связанную сущность (tag_id, user_id, etc.) */
	foreignKey: string;

	/**
	 * Полиморфная связь? (entity_type + entity_id)
	 * true → junction table имеет entity_type + entity_id (наш entity_tags)
	 * false → junction table имеет конкретный FK (note_id, task_id)
	 * @default false
	 */
	polymorphic?: boolean;

	/**
	 * FK на основную сущность (для НЕ полиморфных связей)
	 * Например "note_id" в таблице note_collaborators
	 * Не нужен если polymorphic = true
	 */
	entityKey?: string;
}

export interface FieldConfig {
	component: ComponentType<any>;
	label?: string;
	placeholder?: string;
	props?: Record<string, any>;
	saveMode?: "auto" | "manual" | "hybrid";
	debounceMs?: number;

	/**
	 * Конфигурация связи — если поле хранит M2M данные
	 * При создании: useEntityDraft автоматически извлечёт IDs
	 * и создаст записи в junction table
	 */
	relation?: RelationConfig;
}

export interface EntityConfig {
	fields: Record<string, FieldConfig>;
}

export type Registry = {
	[K in EntityType]?: EntityConfig;
};

// ============================================================================
// OPTIONS
// ============================================================================

export const STATUS_NOTE_OPTIONS = [
	{ value: "todo", label: "Активный" },
	{ value: "in_progress", label: "В процессе" },
	{ value: "review", label: "Аудит" },
	{ value: "done", label: "Выполнено" },
	{ value: "archived", label: "В архиве" },
];

// ============================================================================
// REGISTRY
// ============================================================================

export const EntityRegistry: Registry = {
	notes: {
		fields: {
			title: {
				component: EditableText,
				label: "Заголовок",
				placeholder: "Введите заголовок заметки...",
				saveMode: "auto",
				debounceMs: 500,
			},
			description: {
				component: EditableTextarea,
				label: "Описание",
				placeholder: "Напишите подробное описание...",
				saveMode: "auto",
				debounceMs: 800,
				props: { rows: 8 },
			},
			status: {
				component: EditableSelect,
				label: "Состояние",
				saveMode: "auto",
				props: {
					options: STATUS_NOTE_OPTIONS,
				},
			},
			tags: {
				component: EditableTags,
				label: "Теги",
				props: {
					allowCreate: true,
				},
				// ✅ M2M конфигурация — generic, не хардкод
				relation: {
					type: "m2m",
					junctionTable: "entity_tags",
					foreignKey: "tag_id",
					polymorphic: true,
				},
			},
			category_id: {
				component: EditableCombobox,
				label: "Категория",
				props: {
					referenceTable: "categories",
					displayField: "name",
					parentField: "parent_id",
					filter: { entity_type: "notes" },
					allowNull: true,
					nullLabel: "Без категории",
				},
				// Нет relation — это обычное FK поле на notes, не M2M
			},

			is_favorite: {
				component: EditableToggle,
				label: "", // label не нужен сверху, текст внутри toggle
				saveMode: "auto",
				props: {
					icon: <Star className="h-4 w-4" />,
					activeIcon: <Star className="h-4 w-4 fill-current" />,
					label: "Bookmark",
					size: "sm",
					variant: "outline",
				},
			},

			// ============================================================
			// ПРИМЕРЫ будущих M2M связей:
			// ============================================================
			//
			// collaborators: {
			//   component: EditableUserPicker,
			//   label: "Участники",
			//   relation: {
			//     type: "m2m",
			//     junctionTable: "note_collaborators",
			//     foreignKey: "user_id",
			//     polymorphic: false,
			//     entityKey: "note_id",
			//   },
			// },
			//
			// attachments: {
			//   component: EditableFilePicker,
			//   label: "Файлы",
			//   relation: {
			//     type: "m2m",
			//     junctionTable: "entity_attachments",
			//     foreignKey: "file_id",
			//     polymorphic: true,
			//   },
			// },
		},
	},
};

// ============================================================================
// HELPERS
// ============================================================================

export function getFieldConfig(
	entity: EntityType,
	field: string,
): FieldConfig | undefined {
	return EntityRegistry[entity]?.fields[field];
}

export function getEntityFields(entity: EntityType): string[] {
	const config = EntityRegistry[entity];
	if (!config) return [];
	return Object.keys(config.fields);
}

export function hasFieldConfig(entity: EntityType, field: string): boolean {
	return !!EntityRegistry[entity]?.fields[field];
}

/**
 * ✅ Получить все M2M поля для сущности
 *
 * Используется useEntityDraft при create() — автоматически находит
 * все поля с relation.type === "m2m" и извлекает IDs из Store.
 */
export function getM2MFields(
	entity: EntityType,
): { field: string; relation: RelationConfig }[] {
	const config = EntityRegistry[entity];
	if (!config) return [];

	return Object.entries(config.fields)
		.filter(([, fc]) => fc.relation?.type === "m2m")
		.map(([field, fc]) => ({
			field,
			relation: fc.relation!,
		}));
}
