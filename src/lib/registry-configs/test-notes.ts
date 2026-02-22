import { EditableText } from '@/components/fields/EditableText-v2'
import { EditableTextarea } from '@/components/fields/EditableTextarea'
import type { EntityConfig } from '@/lib/registry-types'

export const testNotesConfig: EntityConfig = {
	displayName: 'Notes',

	fields: {
		// ID - только для чтения
		id: {
			component: EditableText,
			label: 'ID',
			readOnly: true,
			saveMode: 'auto',
		},

		// Title - обязательное поле
		title: {
			component: EditableText,
			label: 'Title',
			placeholder: 'Enter note title...',
			required: true,
			minLength: 1,
			maxLength: 200,
			saveMode: 'auto',
			debounceMs: 500,
		},

		// Description - опциональное
		description: {
			component: EditableTextarea,
			label: 'Description',
			placeholder: 'Add description (optional)...',
			maxLength: 2000,
			saveMode: 'auto',
			debounceMs: 1000,
		},

		// Created at - только для чтения
		created_at: {
			component: EditableText,
			label: 'Created',
			readOnly: true,
			saveMode: 'auto',
		},

		// Updated at - только для чтения
		updated_at: {
			component: EditableText,
			label: 'Updated',
			readOnly: true,
			saveMode: 'auto',
		},
	},
}