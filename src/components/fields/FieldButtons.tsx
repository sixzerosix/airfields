import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface FieldButtonsProps {
	/**
	 * Обработчик сохранения (Submit)
	 */
	onSubmit?: () => void | Promise<void>;

	/**
	 * Обработчик отмены (Cancel)
	 */
	onCancel?: () => void;

	/**
	 * Текст кнопки Submit
	 * @default "Save"
	 */
	submitText?: string;

	/**
	 * Текст кнопки Cancel
	 * @default "Cancel"
	 */
	cancelText?: string;

	/**
	 * Вариант кнопки Submit
	 * @default "default"
	 */
	submitVariant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";

	/**
	 * Вариант кнопки Cancel
	 * @default "ghost"
	 */
	cancelVariant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";

	/**
	 * Размер кнопок
	 * @default "default"
	 */
	size?: "default" | "sm" | "lg" | "icon";

	/**
	 * Отключить кнопки (loading state)
	 */
	disabled?: boolean;

	/**
	 * Показывать loader в Submit кнопке
	 */
	loading?: boolean;

	/**
	 * Показывать кнопку Submit
	 * @default true
	 */
	showSubmit?: boolean;

	/**
	 * Показывать кнопку Cancel
	 * @default true
	 */
	showCancel?: boolean;

	/**
	 * Дополнительные кнопки (рендерятся справа)
	 *
	 * @example
	 * <FieldButtons onSubmit={save} onCancel={cancel}>
	 *   <Button onClick={clear}>Clear</Button>
	 *   <Button onClick={reset}>Reset</Button>
	 * </FieldButtons>
	 */
	children?: ReactNode;

	/**
	 * CSS класс для контейнера
	 */
	className?: string;

	/**
	 * Выравнивание кнопок
	 * @default "left"
	 */
	align?: "left" | "center" | "right" | "between";
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FieldButtons - компонент для кнопок управления полями
 *
 * Используется с FieldGroup для manual/hybrid save режимов.
 * Кнопки вынесены ОТДЕЛЬНО от полей для максимальной гибкости.
 *
 * ИСПОЛЬЗОВАНИЕ:
 *
 * 1. Базовое:
 *    <FieldButtons onSubmit={handleSave} onCancel={handleCancel} />
 *
 * 2. Кастомизация текста:
 *    <FieldButtons
 *      onSubmit={save}
 *      submitText="Сохранить"
 *      cancelText="Отмена"
 *    />
 *
 * 3. Дополнительные кнопки:
 *    <FieldButtons onSubmit={save} onCancel={cancel}>
 *      <Button onClick={clear}>Clear</Button>
 *      <Button onClick={reset}>Reset</Button>
 *    </FieldButtons>
 *
 * 4. Loading state:
 *    <FieldButtons onSubmit={save} loading={isSaving} />
 *
 * 5. Только Submit (без Cancel):
 *    <FieldButtons onSubmit={save} showCancel={false} />
 */
export function FieldButtons({
	onSubmit,
	onCancel,
	submitText = "Save",
	cancelText = "Cancel",
	submitVariant = "default",
	cancelVariant = "ghost",
	size = "default",
	disabled = false,
	loading = false,
	showSubmit = true,
	showCancel = true,
	children,
	className,
	align = "left",
}: FieldButtonsProps) {
	// ========================================================================
	// ALIGNMENT
	// ========================================================================

	const alignmentClasses = {
		left: "justify-start",
		center: "justify-center",
		right: "justify-end",
		between: "justify-between",
	};

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div
			className={cn(
				"flex items-center gap-2",
				alignmentClasses[align],
				className,
			)}
		>
			{/* ================================================================== */}
			{/* SUBMIT BUTTON */}
			{/* ================================================================== */}

			{showSubmit && (
				<Button
					type="button"
					variant={submitVariant}
					size={size}
					onClick={onSubmit}
					disabled={disabled || loading}
				>
					{loading && (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					)}
					{submitText}
				</Button>
			)}

			{/* ================================================================== */}
			{/* CANCEL BUTTON */}
			{/* ================================================================== */}

			{showCancel && (
				<Button
					type="button"
					variant={cancelVariant}
					size={size}
					onClick={onCancel}
					disabled={disabled || loading}
				>
					{cancelText}
				</Button>
			)}

			{/* ================================================================== */}
			{/* CUSTOM BUTTONS */}
			{/* ================================================================== */}

			{children}
		</div>
	);
}

// ============================================================================
// EXAMPLES (для документации)
// ============================================================================

/**
 * ПРИМЕР 1: Базовое использование
 *
 * <FieldGroup>
 *   <EntityField name="title" saveMode="manual" />
 *   <EntityField name="description" saveMode="manual" />
 * </FieldGroup>
 *
 * <FieldButtons
 *   onSubmit={handleSave}
 *   onCancel={handleCancel}
 * />
 */

/**
 * ПРИМЕР 2: Кастомизация
 *
 * <FieldButtons
 *   onSubmit={save}
 *   onCancel={cancel}
 *   submitText="Сохранить изменения"
 *   cancelText="Отменить"
 *   submitVariant="default"
 *   size="lg"
 * />
 */

/**
 * ПРИМЕР 3: Дополнительные кнопки
 *
 * <FieldButtons onSubmit={save} onCancel={cancel}>
 *   <Button variant="outline" onClick={clear}>
 *     Очистить
 *   </Button>
 *   <Button variant="destructive" onClick={deleteAll}>
 *     Удалить всё
 *   </Button>
 * </FieldButtons>
 */

/**
 * ПРИМЕР 4: Loading state
 *
 * const [isSaving, setIsSaving] = useState(false)
 *
 * const handleSave = async () => {
 *   setIsSaving(true)
 *   await saveData()
 *   setIsSaving(false)
 * }
 *
 * <FieldButtons
 *   onSubmit={handleSave}
 *   loading={isSaving}
 * />
 */

/**
 * ПРИМЕР 5: Только Submit (автоматическая отмена)
 *
 * <FieldButtons
 *   onSubmit={save}
 *   showCancel={false}
 * />
 */

/**
 * ПРИМЕР 6: Выравнивание
 *
 * <FieldButtons
 *   onSubmit={save}
 *   align="right"  // кнопки справа
 * />
 */
