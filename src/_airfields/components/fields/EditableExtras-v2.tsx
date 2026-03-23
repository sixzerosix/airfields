import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEditableField } from "@/hooks/useEditableField-v2";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ============================================================================
// EDITABLE SWITCH
// ============================================================================

interface EditableSwitchProps<E extends EntityType> {
  entity: E;
  entityId: string;
  field: keyof EntityDataMap[E];
  value: boolean | undefined | null;
  
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  
  saveMode?: "auto" | "manual" | "hybrid";
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EditableSwitch<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  label,
  description,
  className,
  disabled = false,
  saveMode = "auto",
  onSuccess,
  onError,
}: EditableSwitchProps<E>) {
  const { localValue, isUpdating, error, handleChange, handleFocus } = useEditableField({
    entity,
    entityId,
    field,
    value: value ?? false,
    debounceMs: 0,
    saveMode,
    onSuccess,
    onError,
  });
  
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="space-y-0.5">
        {label && <Label>{label}</Label>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Switch
        data-entity={entity}
        data-entity-id={entityId}
        data-field={String(field)}
        checked={localValue}
        onCheckedChange={handleChange}
        onFocus={handleFocus}
        disabled={disabled || isUpdating}
      />
    </div>
  );
}

// ============================================================================
// EDITABLE DATETIME
// ============================================================================

interface EditableDateTimeProps<E extends EntityType> {
  entity: E;
  entityId: string;
  field: keyof EntityDataMap[E];
  value: string | undefined | null;
  
  label?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  
  saveMode?: "auto" | "manual" | "hybrid";
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EditableDateTime<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  label,
  className,
  disabled = false,
  required = false,
  saveMode = "auto",
  onSuccess,
  onError,
}: EditableDateTimeProps<E>) {
  const { localValue, isUpdating, error, handleChange, handleBlur, handleFocus } = useEditableField({
    entity,
    entityId,
    field,
    value: value || "",
    debounceMs: 0,
    saveMode,
    onSuccess,
    onError,
  });
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Input
        type="datetime-local"
        data-entity={entity}
        data-entity-id={entityId}
        data-field={String(field)}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={saveMode === "auto" ? handleBlur : undefined}
        onFocus={handleFocus}
        disabled={disabled || isUpdating}
        required={required}
        className={cn(error && "border-destructive")}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// EDITABLE EMAIL
// ============================================================================

interface EditableEmailProps<E extends EntityType> {
  entity: E;
  entityId: string;
  field: keyof EntityDataMap[E];
  value: string | undefined | null;
  
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  
  saveMode?: "auto" | "manual" | "hybrid";
  debounceMs?: number;
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EditableEmail<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  label,
  placeholder = "email@example.com",
  className,
  disabled = false,
  required = false,
  saveMode = "auto",
  debounceMs = 500,
  onSuccess,
  onError,
}: EditableEmailProps<E>) {
  const { localValue, isUpdating, error, handleChange, handleBlur, handleFocus } = useEditableField({
    entity,
    entityId,
    field,
    value: value || "",
    debounceMs,
    saveMode,
    onSuccess,
    onError,
  });
  
  const [validationError, setValidationError] = React.useState<string | null>(null);
  
  const handleChangeWithValidation = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (required && !newValue.trim()) {
      setValidationError("Email is required");
    } else if (newValue && !emailRegex.test(newValue)) {
      setValidationError("Invalid email format");
    } else {
      setValidationError(null);
      handleChange(newValue);
    }
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Input
        type="email"
        data-entity={entity}
        data-entity-id={entityId}
        data-field={String(field)}
        value={localValue}
        onChange={handleChangeWithValidation}
        onBlur={saveMode === "auto" ? handleBlur : undefined}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled || isUpdating}
        required={required}
        className={cn((error || validationError) && "border-destructive")}
      />
      {validationError && <p className="text-sm text-destructive">{validationError}</p>}
      {error && !validationError && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// EDITABLE COLOR
// ============================================================================

interface EditableColorProps<E extends EntityType> {
  entity: E;
  entityId: string;
  field: keyof EntityDataMap[E];
  value: string | undefined | null;
  
  label?: string;
  className?: string;
  disabled?: boolean;
  
  saveMode?: "auto" | "manual" | "hybrid";
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EditableColor<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  label,
  className,
  disabled = false,
  saveMode = "auto",
  onSuccess,
  onError,
}: EditableColorProps<E>) {
  const { localValue, isUpdating, error, handleChange, handleFocus } = useEditableField({
    entity,
    entityId,
    field,
    value: value || "#000000",
    debounceMs: 0,
    saveMode,
    onSuccess,
    onError,
  });
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-3">
        <Input
          type="color"
          data-entity={entity}
          data-entity-id={entityId}
          data-field={String(field)}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          disabled={disabled || isUpdating}
          className="h-10 w-20 cursor-pointer"
        />
        <Input
          type="text"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled || isUpdating}
          className="font-mono"
          placeholder="#000000"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// EDITABLE MULTI-SELECT
// ============================================================================

interface EditableMultiSelectProps<E extends EntityType> {
  entity: E;
  entityId: string;
  field: keyof EntityDataMap[E];
  value: string[] | undefined | null;
  
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  
  options: Array<{ value: string; label: string }>;
  
  saveMode?: "auto" | "manual" | "hybrid";
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EditableMultiSelect<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  label,
  placeholder = "Select items...",
  className,
  disabled = false,
  options,
  saveMode = "auto",
  onSuccess,
  onError,
}: EditableMultiSelectProps<E>) {
  const { localValue, isUpdating, error, handleChange, handleFocus } = useEditableField({
    entity,
    entityId,
    field,
    value: value || [],
    debounceMs: 0,
    saveMode,
    onSuccess,
    onError,
  });
  
  const handleToggle = (optionValue: string) => {
    const newValue = localValue.includes(optionValue)
      ? localValue.filter((v: string) => v !== optionValue)
      : [...localValue, optionValue];
    handleChange(newValue);
  };
  
  const handleRemove = (optionValue: string) => {
    handleChange(localValue.filter((v: string) => v !== optionValue));
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      
      {/* Selected items */}
      {localValue.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {localValue.map((val: string) => {
            const option = options.find((o) => o.value === val);
            return (
              <Badge key={val} variant="secondary">
                {option?.label || val}
                <button
                  type="button"
                  onClick={() => handleRemove(val)}
                  className="ml-1 hover:text-destructive"
                  disabled={disabled || isUpdating}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      
      {/* Options */}
      <div className="space-y-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded"
          >
            <input
              type="checkbox"
              checked={localValue.includes(option.value)}
              onChange={() => handleToggle(option.value)}
              onFocus={handleFocus}
              disabled={disabled || isUpdating}
              data-entity={entity}
              data-entity-id={entityId}
              data-field={String(field)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
