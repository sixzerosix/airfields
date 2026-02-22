/**
 * EXAMPLE REGISTRY CONFIG - COMPANIES
 * 
 * Демонстрация conditional fields для формы компании
 */

import { EditableText } from '@/components/fields/EditableText'
import { EditableSelect } from '@/components/fields/EditableSelect'
import { EditableEmail } from '@/components/fields/EditableEmail'
import { EditableTextarea } from '@/components/fields/EditableTextarea'
import type { EntityConfig } from '@/lib/registry-types'

// ============================================================================
// OPTIONS
// ============================================================================

const COMPANY_TYPE_OPTIONS = [
	{ value: 'legal_entity', label: 'Юридическое лицо' },
	{ value: 'individual', label: 'Физическое лицо (ИП)' },
	{ value: 'self_employed', label: 'Самозанятый' },
]

const LEGAL_FORM_OPTIONS = [
	{ value: 'ooo', label: 'ООО' },
	{ value: 'ao', label: 'АО' },
	{ value: 'pao', label: 'ПАО' },
	{ value: 'ip', label: 'ИП' },
]

// ============================================================================
// COMPANY REGISTRY
// ============================================================================

export const companyConfig: EntityConfig = {
	displayName: 'Компании',

	fields: {
		// ========================================================================
		// ОСНОВНАЯ ИНФОРМАЦИЯ (всегда видимо)
		// ========================================================================

		name: {
			component: EditableText,
			label: 'Название компании',
			placeholder: 'ООО "Рога и Копыта"',
			required: true,
			minLength: 2,
			maxLength: 200,
			saveMode: 'auto',
			debounceMs: 500,
		},

		company_type: {
			component: EditableSelect,
			label: 'Тип компании',
			placeholder: 'Выберите тип',
			required: true,
			props: {
				options: COMPANY_TYPE_OPTIONS,
			},
			saveMode: 'auto',
		},

		email: {
			component: EditableEmail,
			label: 'Email',
			placeholder: 'info@company.com',
			required: true,
			saveMode: 'auto',
		},

		description: {
			component: EditableTextarea,
			label: 'Описание',
			placeholder: 'Краткое описание деятельности компании...',
			saveMode: 'auto',
			debounceMs: 1000,
		},

		// ========================================================================
		// ДЛЯ ЮРИДИЧЕСКИХ ЛИЦ (conditional)
		// ========================================================================

		legal_form: {
			component: EditableSelect,
			label: 'Организационно-правовая форма',
			placeholder: 'Выберите форму',
			props: {
				options: LEGAL_FORM_OPTIONS,
			},
			// ✅ ПОКАЗАТЬ только для юр. лиц
			visibleWhen: {
				field: 'company_type',
				equals: 'legal_entity',
			},
			// ✅ ОБЯЗАТЕЛЬНО для юр. лиц
			requiredWhen: {
				field: 'company_type',
				equals: 'legal_entity',
			},
			saveMode: 'auto',
		},

		inn: {
			component: EditableText,
			label: 'ИНН',
			placeholder: '1234567890',
			helpText: '10 цифр для юр. лиц, 12 для ИП',
			// ✅ ПОКАЗАТЬ для юр. лиц и ИП
			visibleWhen: {
				field: 'company_type',
				condition: (value) => value === 'legal_entity' || value === 'individual',
			},
			// ✅ ОБЯЗАТЕЛЬНО для юр. лиц и ИП
			requiredWhen: {
				field: 'company_type',
				condition: (value) => value === 'legal_entity' || value === 'individual',
			},
			minLength: 10,
			maxLength: 12,
			pattern: /^\d+$/,
			saveMode: 'auto',
		},

		kpp: {
			component: EditableText,
			label: 'КПП',
			placeholder: '123456789',
			helpText: '9 цифр',
			// ✅ ПОКАЗАТЬ только для юр. лиц
			visibleWhen: {
				field: 'company_type',
				equals: 'legal_entity',
			},
			// ✅ ОБЯЗАТЕЛЬНО для юр. лиц
			requiredWhen: {
				field: 'company_type',
				equals: 'legal_entity',
			},
			minLength: 9,
			maxLength: 9,
			pattern: /^\d+$/,
			saveMode: 'auto',
		},

		ogrn: {
			component: EditableText,
			label: 'ОГРН',
			placeholder: '1234567890123',
			helpText: '13 цифр для юр. лиц, 15 для ИП',
			// ✅ ПОКАЗАТЬ для юр. лиц и ИП
			visibleWhen: {
				field: 'company_type',
				condition: (value) => value === 'legal_entity' || value === 'individual',
			},
			// ✅ ОБЯЗАТЕЛЬНО для юр. лиц и ИП
			requiredWhen: {
				field: 'company_type',
				condition: (value) => value === 'legal_entity' || value === 'individual',
			},
			saveMode: 'auto',
		},

		legal_address: {
			component: EditableTextarea,
			label: 'Юридический адрес',
			placeholder: 'г. Москва, ул. Ленина, д. 1',
			// ✅ ПОКАЗАТЬ для юр. лиц и ИП
			visibleWhen: {
				field: 'company_type',
				condition: (value) => value === 'legal_entity' || value === 'individual',
			},
			saveMode: 'auto',
		},

		// ========================================================================
		// ДЛЯ САМОЗАНЯТЫХ (conditional)
		// ========================================================================

		self_employed_certificate: {
			component: EditableText,
			label: 'Номер справки самозанятого',
			placeholder: 'XXXXX-XXXXX',
			// ✅ ПОКАЗАТЬ только для самозанятых
			visibleWhen: {
				field: 'company_type',
				equals: 'self_employed',
			},
			// ✅ ОБЯЗАТЕЛЬНО для самозанятых
			requiredWhen: {
				field: 'company_type',
				equals: 'self_employed',
			},
			saveMode: 'auto',
		},

		// ========================================================================
		// КОНТАКТНАЯ ИНФОРМАЦИЯ (всегда видимо)
		// ========================================================================

		phone: {
			component: EditableText,
			label: 'Телефон',
			placeholder: '+7 (999) 123-45-67',
			saveMode: 'auto',
		},

		website: {
			component: EditableText,
			label: 'Веб-сайт',
			placeholder: 'https://example.com',
			saveMode: 'auto',
		},
	},
}