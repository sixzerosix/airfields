"use client";

import { useState } from "react";
import { FieldGroup, FieldSection } from "@/components/fields/FieldGroup";
import { EntityField } from "@/components/EntityField";
import { FieldButtons } from "@/components/fields/FieldButtons";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { updateFieldsBatch } from "@/lib/field-handler";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface CompanyEditorProps {
	/**
	 * ID компании для редактирования
	 */
	companyId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * CompanyEditor - пример использования conditional fields
 *
 * Демонстрирует:
 * - Conditional visibility (поля появляются/исчезают)
 * - Conditional required (поля становятся обязательными)
 * - FieldGroup с conditional режимом
 * - FieldSection для группировки
 * - FieldButtons для batch save
 */

export function CompanyEditor({ companyId }: CompanyEditorProps) {
	// ========================================================================
	// STATE
	// ========================================================================

	const [isSaving, setIsSaving] = useState(false);

	// Получить компанию из Store
	const company = useStore((state) => state.entities.companies?.[companyId]);

	if (!company) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-muted-foreground">Компания не найдена</p>
				</CardContent>
			</Card>
		);
	}

	// ========================================================================
	// HANDLERS
	// ========================================================================

	/**
	 * Batch save всех изменений
	 */
	const handleSaveAll = async () => {
		setIsSaving(true);

		try {
			// Все изменения уже в Store (optimistic updates)
			// Просто показываем успех
			toast.success("Изменения сохранены", {
				description: "Все данные компании обновлены",
			});
		} catch (error) {
			toast.error("Ошибка сохранения", {
				description: "Не удалось сохранить изменения",
			});
		} finally {
			setIsSaving(false);
		}
	};

	/**
	 * Отменить все изменения
	 */
	const handleCancel = () => {
		// TODO: Implement rollback logic
		toast.info("Изменения отменены");
	};

	/**
	 * Очистить все поля
	 */
	const handleClear = () => {
		// TODO: Implement clear logic
		toast.info("Поля очищены");
	};

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<Card>
			<CardHeader>
				<CardTitle>Редактирование компании</CardTitle>
				<CardDescription>
					Измените данные компании. Поля автоматически сохраняются при
					изменении.
					<br />
					<span className="text-xs text-muted-foreground">
						💡 Попробуйте изменить тип компании - поля изменятся
						автоматически!
					</span>
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-6">
				{/* ================================================================ */}
				{/* CONDITIONAL FIELD GROUP */}
				{/* ================================================================ */}

				<FieldGroup
					entity="companies"
					entityId={companyId}
					conditional // ✅ Включаем conditional режим!
				>
					{/* ============================================================== */}
					{/* СЕКЦИЯ: Основная информация */}
					{/* ============================================================== */}

					<FieldSection
						title="Основная информация"
						description="Базовые данные компании"
					>
						<EntityField
							entity="companies"
							entityId={companyId}
							name="name"
							value={company.name}
						/>

						<EntityField
							entity="companies"
							entityId={companyId}
							name="company_type"
							value={company.company_type}
						/>

						<EntityField
							entity="companies"
							entityId={companyId}
							name="email"
							value={company.email}
						/>

						<EntityField
							entity="companies"
							entityId={companyId}
							name="description"
							value={company.description}
						/>
					</FieldSection>

					{/* ============================================================== */}
					{/* СЕКЦИЯ: Реквизиты (conditional!) */}
					{/* ============================================================== */}

					<FieldSection
						title="Реквизиты"
						description="Документы и регистрационные данные"
					>
						{/* ✅ Это поле появится только для юр. лиц */}
						<EntityField
							entity="companies"
							entityId={companyId}
							name="legal_form"
							value={company.legal_form}
						/>

						{/* ✅ Это поле появится для юр. лиц и ИП */}
						<EntityField
							entity="companies"
							entityId={companyId}
							name="inn"
							value={company.inn}
						/>

						{/* ✅ Это поле появится только для юр. лиц */}
						<EntityField
							entity="companies"
							entityId={companyId}
							name="kpp"
							value={company.kpp}
						/>

						{/* ✅ Это поле появится для юр. лиц и ИП */}
						<EntityField
							entity="companies"
							entityId={companyId}
							name="ogrn"
							value={company.ogrn}
						/>

						{/* ✅ Это поле появится для юр. лиц и ИП */}
						<EntityField
							entity="companies"
							entityId={companyId}
							name="legal_address"
							value={company.legal_address}
						/>

						{/* ✅ Это поле появится только для самозанятых */}
						<EntityField
							entity="companies"
							entityId={companyId}
							name="self_employed_certificate"
							value={company.self_employed_certificate}
						/>
					</FieldSection>

					{/* ============================================================== */}
					{/* СЕКЦИЯ: Контакты */}
					{/* ============================================================== */}

					<FieldSection
						title="Контактная информация"
						description="Телефон, сайт и другие контакты"
					>
						<EntityField
							entity="companies"
							entityId={companyId}
							name="phone"
							value={company.phone}
						/>

						<EntityField
							entity="companies"
							entityId={companyId}
							name="website"
							value={company.website}
						/>
					</FieldSection>
				</FieldGroup>

				{/* ================================================================ */}
				{/* BUTTONS (опционально для batch save) */}
				{/* ================================================================ */}

				<FieldButtons
					onSubmit={handleSaveAll}
					onCancel={handleCancel}
					submitText="Сохранить все"
					cancelText="Отменить"
					disabled={isSaving}
				>
					<Button
						variant="ghost"
						onClick={handleClear}
						disabled={isSaving}
					>
						Очистить
					</Button>
				</FieldButtons>

				{/* ================================================================ */}
				{/* DEBUG INFO */}
				{/* ================================================================ */}

				<details className="text-xs text-muted-foreground">
					<summary className="cursor-pointer">
						🔍 Debug: Current values
					</summary>
					<pre className="mt-2 p-2 bg-muted rounded">
						{JSON.stringify(company, null, 2)}
					</pre>
				</details>
			</CardContent>
		</Card>
	);
}
