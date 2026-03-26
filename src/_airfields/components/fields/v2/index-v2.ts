/**
 * Field Components v2 - БЕЗ React Hook Form!
 * 
 * Все компоненты обновлены:
 * ✅ Убраны встроенные кнопки (используй FieldButtons)
 * ✅ Добавлены validation props
 * ✅ useEditableField-v2 БЕЗ RHF
 * ✅ Прямая валидация через Zod
 * ✅ Sync с Store через useStore
 */

// Core
// export { EditableText } from './EditableText-v2'
// export { EditableTextarea } from './EditableTextarea-v2'
// export { EditableNumber } from './EditableNumber-v2'
// export { EditableSelect } from './EditableSelect-v2'

// // Date & Time
// export { EditableDate, EditableCheckbox } from './EditableDate-and-Checkbox-v2'
export { EditableDateRange } from './EditableAdvanced-v2'
export { EditableDateTime } from './EditableExtras-v2'

// Boolean
export { EditableSwitch } from './EditableExtras-v2'

// Advanced
export { EditableEmail, EditableColor, EditableMultiSelect } from './EditableExtras-v2'
export {
  EditableRichText,
  EditableFileUpload,
  EditableImageUpload,
  ManyToManyTags,
  ReferencePicker
} from './EditableAdvanced-v2'

// Buttons (используй вместо встроенных кнопок)
// export { FieldButtons } from './FieldButtons'

// // Groups
// export { FieldGroup } from './FieldGroup'
