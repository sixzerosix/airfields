import { CompanyEditor } from "@/components/examples/CompanyEditor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const metadata = {
	title: "Conditional Fields Demo",
	description: "Демонстрация работы conditional fields",
};

/**
 * Demo страница для conditional fields
 *
 * Показывает как работает система conditional visibility и required
 */

export default function ConditionalFieldsDemoPage() {
	// В реальном приложении ID будет из URL params
	const demoCompanyId = "demo-company-123";

	return (
		<div className="container mx-auto py-10 space-y-6">
			{/* ================================================================ */}
			{/* HEADER */}
			{/* ================================================================ */}

			<div>
				<h1 className="text-3xl font-bold tracking-tight">
					Conditional Fields Demo
				</h1>
				<p className="text-muted-foreground mt-2">
					Демонстрация динамической видимости и обязательности полей
				</p>
			</div>

			{/* ================================================================ */}
			{/* INFO ALERT */}
			{/* ================================================================ */}

			<Alert>
				<Info className="h-4 w-4" />
				<AlertTitle>Как это работает?</AlertTitle>
				<AlertDescription className="space-y-2 text-sm">
					<p>
						1. Измените <strong>Тип компании</strong> на
						"Юридическое лицо" - появятся поля: Форма, ИНН, КПП,
						ОГРН, Юр. адрес
					</p>
					<p>
						2. Измените на "Физическое лицо (ИП)" - появятся поля:
						ИНН, ОГРН, Юр. адрес (без КПП и Формы)
					</p>
					<p>
						3. Измените на "Самозанятый" - появится поле: Номер
						справки самозанятого
					</p>
					<p className="text-muted-foreground">
						💡 Все изменения происходят автоматически через
						ConditionalFieldsProvider
					</p>
				</AlertDescription>
			</Alert>

			{/* ================================================================ */}
			{/* COMPANY EDITOR */}
			{/* ================================================================ */}

			<CompanyEditor companyId={demoCompanyId} />

			{/* ================================================================ */}
			{/* FEATURES LIST */}
			{/* ================================================================ */}

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2 p-4 border rounded-lg">
					<h3 className="font-semibold">✅ Реализовано</h3>
					<ul className="text-sm space-y-1 text-muted-foreground">
						<li>• Conditional visibility (visibleWhen)</li>
						<li>• Conditional required (requiredWhen)</li>
						<li>• Simple conditions (equals)</li>
						<li>• Complex conditions (функции)</li>
						<li>• Auto-save на каждое поле</li>
						<li>• Zustand как single source</li>
						<li>• Opt-in через conditional prop</li>
					</ul>
				</div>

				<div className="space-y-2 p-4 border rounded-lg">
					<h3 className="font-semibold">🚧 Планируется</h3>
					<ul className="text-sm space-y-1 text-muted-foreground">
						<li>• AND/OR условия (multiple dependencies)</li>
						<li>• Nested conditions</li>
						<li>• Computed fields</li>
						<li>• Cross-entity conditions</li>
						<li>• Conditional validation messages</li>
						<li>• Visual feedback для hidden fields</li>
					</ul>
				</div>
			</div>

			{/* ================================================================ */}
			{/* CODE EXAMPLE */}
			{/* ================================================================ */}

			<details className="p-4 border rounded-lg">
				<summary className="font-semibold cursor-pointer">
					📝 Код примера
				</summary>

				<div className="mt-4 space-y-4">
					<div>
						<p className="text-sm font-medium mb-2">
							1. Registry config:
						</p>
						<pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
							{`inn: {
  component: EditableText,
  label: 'ИНН',
  // ✅ ПОКАЗАТЬ для юр. лиц и ИП
  visibleWhen: {
    field: 'company_type',
    condition: (value) => 
      value === 'legal_entity' || 
      value === 'individual'
  },
  // ✅ ОБЯЗАТЕЛЬНО для юр. лиц и ИП
  requiredWhen: {
    field: 'company_type',
    condition: (value) => 
      value === 'legal_entity' || 
      value === 'individual'
  }
}`}
						</pre>
					</div>

					<div>
						<p className="text-sm font-medium mb-2">
							2. Component usage:
						</p>
						<pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
							{`<FieldGroup 
  entity="companies" 
  entityId={companyId}
  conditional  // ✅ Включить conditional режим
>
  <EntityField name="company_type" />
  <EntityField name="inn" />  // Auto show/hide
</FieldGroup>`}
						</pre>
					</div>
				</div>
			</details>
		</div>
	);
}
