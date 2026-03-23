"use client";

/**
 * EDITABLE NUMBER
 *
 * Компонент для числовых полей
 *
 * Поддерживает:
 * - Integer (целые числа)
 * - Decimal (дробные)
 * - Currency (валюта)
 * - Percentage (проценты)
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEditableField } from "@/hooks/useEditableField";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

type NumberType = "integer" | "decimal" | "currency" | "percentage";

interface EditableNumberProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: keyof EntityDataMap[E];
	value: number | undefined | null;

	// Number type
	numberType?: NumberType;
	currency?: string; // USD, EUR, etc
	decimals?: number; // Decimal places (default: 2)

	// Constraints
	min?: number;
	max?: number;
	step?: number;

	// UI
	label?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	prefix?: string; // Custom prefix (e.g., "$")
	suffix?: string; // Custom suffix (e.g., "kg")

	// Save mode
	debounceMs?: number;
	saveMode?: "auto" | "manual" | "hybrid";
	showSaveButton?: boolean;

	// Callbacks
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditableNumber<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	numberType = "integer",
	currency = "USD",
	decimals = 2,
	min,
	max,
	step,
	label,
	placeholder,
	className,
	disabled = false,
	prefix,
	suffix,
	debounceMs = 500,
	saveMode = "auto",
	showSaveButton = false,
	onSuccess,
	onError,
}: EditableNumberProps<E>) {
	// ========================================================================
	// EDITABLE FIELD HOOK
	// ========================================================================

	const {
		localValue,
		hasUnsavedChanges,
		isSaving,
		error,
		handleChange,
		handleBlur,
		save,
		cancel,
	} = useEditableField({
		entity,
		entityId,
		field,
		value: value ?? null,
		debounceMs,
		saveMode,
		onSuccess,
		onError,
	});

	// ========================================================================
	// FORMAT VALUE FOR DISPLAY
	// ========================================================================

	const formatDisplay = (val: number | null): string => {
		if (val === null || val === undefined) return "";

		switch (numberType) {
			case "currency":
				return new Intl.NumberFormat("en-US", {
					style: "currency",
					currency,
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals,
				}).format(val);

			case "percentage":
				return `${val.toFixed(decimals)}%`;

			case "decimal":
				return val.toFixed(decimals);

			case "integer":
			default:
				return Math.round(val).toString();
		}
	};

	// ========================================================================
	// PARSE INPUT VALUE
	// ========================================================================

	const parseInput = (input: string): number | null => {
		// Remove currency symbols, %, commas
		const cleaned = input.replace(/[^0-9.-]/g, "");

		if (!cleaned) return null;

		const parsed = parseFloat(cleaned);

		if (isNaN(parsed)) return null;

		// Apply constraints
		if (min !== undefined && parsed < min) return min;
		if (max !== undefined && parsed > max) return max;

		return parsed;
	};

	// ========================================================================
	// INPUT CHANGE HANDLER
	// ========================================================================

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const parsed = parseInput(e.target.value);
		handleChange(parsed);
	};

	// ========================================================================
	// DISPLAY VALUES
	// ========================================================================

	const displayValue =
		localValue !== null ? formatDisplay(localValue as number) : "";

	const inputPlaceholder =
		placeholder || (numberType === "currency" ? "$0.00" : "0");

	// Auto prefix/suffix based on type
	const autoPrefix = prefix || (numberType === "currency" ? "$" : "");
	const autoSuffix = suffix || (numberType === "percentage" ? "%" : "");

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<Label htmlFor={`${entity}-${entityId}-${String(field)}`}>
					{label}
				</Label>
			)}

			<div className="flex gap-2">
				<div className="relative flex-1">
					{/* Prefix */}
					{autoPrefix && (
						<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
							{autoPrefix}
						</div>
					)}

					<Input
						id={`${entity}-${entityId}-${String(field)}`}
						type="text"
						inputMode="decimal"
						value={displayValue}
						onChange={handleInputChange}
						onBlur={saveMode === "auto" ? handleBlur : undefined}
						placeholder={inputPlaceholder}
						disabled={disabled}
						min={min}
						max={max}
						step={step}
						data-entity={entity}
						data-entity-id={entityId}
						data-field={String(field)}
						className={cn(
							autoPrefix && "pl-8",
							autoSuffix && "pr-12",
							error &&
								"border-destructive focus-visible:ring-destructive",
						)}
					/>

					{/* Suffix */}
					{autoSuffix && (
						<div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
							{autoSuffix}
						</div>
					)}
				</div>

				{/* Manual Save Buttons */}
				{(saveMode === "manual" || saveMode === "hybrid") &&
					showSaveButton &&
					hasUnsavedChanges && (
						<div className="flex gap-1 shrink-0">
							<Button
								type="button"
								size="sm"
								onClick={save}
								disabled={isSaving}
							>
								{isSaving ? "Saving..." : "Save"}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={cancel}
								disabled={isSaving}
							>
								Cancel
							</Button>
						</div>
					)}
			</div>

			{/* Error */}
			{error && <p className="text-sm text-destructive">{error}</p>}

			{/* Constraints info */}
			{(min !== undefined || max !== undefined) && (
				<p className="text-xs text-muted-foreground">
					{min !== undefined && `Min: ${min}`}
					{min !== undefined && max !== undefined && " • "}
					{max !== undefined && `Max: ${max}`}
				</p>
			)}
		</div>
	);
}

// ============================================================================
// EXAMPLES
// ============================================================================

/**
 * ПРИМЕР 1: Integer (целое число)
 *
 * <EditableNumber
 *   entity="tasks"
 *   entityId={taskId}
 *   field="priority_score"
 *   value={task.priority_score}
 *   numberType="integer"
 *   min={1}
 *   max={10}
 *   label="Priority Score"
 * />
 */

/**
 * ПРИМЕР 2: Currency (деньги)
 *
 * <EditableNumber
 *   entity="projects"
 *   entityId={projectId}
 *   field="budget"
 *   value={project.budget}
 *   numberType="currency"
 *   currency="USD"
 *   decimals={2}
 *   label="Budget"
 * />
 */

/**
 * ПРИМЕР 3: Percentage (проценты)
 *
 * <EditableNumber
 *   entity="tasks"
 *   entityId={taskId}
 *   field="completion"
 *   value={task.completion}
 *   numberType="percentage"
 *   min={0}
 *   max={100}
 *   label="Completion"
 * />
 */

/**
 * ПРИМЕР 4: Decimal с custom suffix
 *
 * <EditableNumber
 *   entity="tasks"
 *   entityId={taskId}
 *   field="weight"
 *   value={task.weight}
 *   numberType="decimal"
 *   decimals={2}
 *   suffix="kg"
 *   label="Weight"
 * />
 */
