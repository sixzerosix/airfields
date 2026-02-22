import { ReactNode } from "react";
import { ConditionalFieldsProvider } from "@/contexts/ConditionalFieldsContext";
import type { EntityType } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface FieldGroupProps {
	/**
	 * Тип сущности (для conditional режима)
	 */
	entity?: EntityType;

	/**
	 * ID сущности (для conditional режима)
	 */
	entityId?: string;

	/**
	 * Включить conditional fields режим
	 * Если true - поля внутри смогут использовать visibleWhen/requiredWhen
	 */
	conditional?: boolean;

	/**
	 * Дочерние элементы (обычно EntityField компоненты)
	 */
	children: ReactNode;

	/**
	 * CSS классы для обёртки
	 */
	className?: string;

	/**
	 * Заголовок группы (опционально)
	 */
	title?: string;

	/**
	 * Описание группы (опционально)
	 */
	description?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FieldGroup - умная обёртка для группы полей
 *
 * РЕЖИМЫ РАБОТЫ:
 *
 * 1. ОБЫЧНЫЙ РЕЖИМ (без conditional):
 *    <FieldGroup>
 *      <EntityField name="title" />
 *      <EntityField name="description" />
 *    </FieldGroup>
 *
 * 2. CONDITIONAL РЕЖИМ (с visibleWhen/requiredWhen):
 *    <FieldGroup entity="companies" entityId={id} conditional>
 *      <EntityField name="company_type" />
 *      <EntityField name="inn" />  // Auto hide if company_type !== 'legal'
 *    </FieldGroup>
 *
 * @example
 * // Простая группа
 * <FieldGroup>
 *   <EntityField entity="tasks" entityId={id} name="title" />
 * </FieldGroup>
 *
 * @example
 * // Conditional группа
 * <FieldGroup
 *   entity="companies"
 *   entityId={companyId}
 *   conditional
 *   title="Реквизиты"
 * >
 *   <EntityField name="company_type" />
 *   <EntityField name="inn" />
 * </FieldGroup>
 */
export function FieldGroup({
	entity,
	entityId,
	conditional = false,
	children,
	className,
	title,
	description,
}: FieldGroupProps) {
	// ========================================================================
	// VALIDATION
	// ========================================================================

	// Если conditional=true, нужны entity и entityId
	if (conditional && (!entity || !entityId)) {
		console.warn(
			"[FieldGroup] conditional=true requires entity and entityId props",
		);
		// Fallback to normal mode
		conditional = false;
	}

	// ========================================================================
	// RENDER
	// ========================================================================

	const content = (
		<div className={cn("space-y-4", className)}>
			{/* Optional header */}
			{(title || description) && (
				<div className="space-y-1">
					{title && (
						<h3 className="text-lg font-medium leading-none">
							{title}
						</h3>
					)}
					{description && (
						<p className="text-sm text-muted-foreground">
							{description}
						</p>
					)}
				</div>
			)}

			{/* Fields */}
			{children}
		</div>
	);

	// ========================================================================
	// CONDITIONAL MODE
	// ========================================================================

	if (conditional && entity && entityId) {
		return (
			<ConditionalFieldsProvider entity={entity} entityId={entityId}>
				{content}
			</ConditionalFieldsProvider>
		);
	}

	// ========================================================================
	// NORMAL MODE
	// ========================================================================

	return content;
}

// ============================================================================
// HELPER COMPONENT: FIELD SECTION
// ============================================================================

interface FieldSectionProps {
	title: string;
	description?: string;
	children: ReactNode;
	className?: string;
}

/**
 * FieldSection - секция внутри FieldGroup
 *
 * Используется для визуального разделения полей на группы
 *
 * @example
 * <FieldGroup entity="users" entityId={id} conditional>
 *   <FieldSection title="Основная информация">
 *     <EntityField name="name" />
 *     <EntityField name="email" />
 *   </FieldSection>
 *
 *   <FieldSection title="Контакты">
 *     <EntityField name="phone" />
 *     <EntityField name="address" />
 *   </FieldSection>
 * </FieldGroup>
 */
export function FieldSection({
	title,
	description,
	children,
	className,
}: FieldSectionProps) {
	return (
		<div className={cn("space-y-3", className)}>
			<div className="space-y-1 pb-2 border-b">
				<h4 className="text-sm font-medium">{title}</h4>
				{description && (
					<p className="text-xs text-muted-foreground">
						{description}
					</p>
				)}
			</div>

			<div className="space-y-3">{children}</div>
		</div>
	);
}
