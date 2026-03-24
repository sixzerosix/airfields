import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEditableField } from "@/hooks/useEditableField-v2";
import type { EntityType, EntityDataMap } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { X, Upload, Image as ImageIcon } from "lucide-react";

// ============================================================================
// EDITABLE DATE RANGE
// ============================================================================

interface EditableDateRangeProps<E extends EntityType> {
  entity: E;
  entityId: string;
  startField: keyof EntityDataMap[E];
  endField: keyof EntityDataMap[E];
  startValue: string | undefined | null;
  endValue: string | undefined | null;
  
  label?: string;
  className?: string;
  disabled?: boolean;
  
  saveMode?: "auto" | "manual" | "hybrid";
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EditableDateRange<E extends EntityType>({
  entity,
  entityId,
  startField,
  endField,
  startValue,
  endValue,
  label,
  className,
  disabled = false,
  saveMode = "auto",
  onSuccess,
  onError,
}: EditableDateRangeProps<E>) {
  const startHook = useEditableField({
    entity,
    entityId,
    field: startField,
    value: startValue || "",
    debounceMs: 0,
    saveMode,
    onSuccess,
    onError,
  });
  
  const endHook = useEditableField({
    entity,
    entityId,
    field: endField,
    value: endValue || "",
    debounceMs: 0,
    saveMode,
    onSuccess,
    onError,
  });
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <Input
          type="date"
          data-entity={entity}
          data-entity-id={entityId}
          data-field={String(startField)}
          value={startHook.localValue}
          onChange={(e) => startHook.handleChange(e.target.value)}
          onBlur={saveMode === "auto" ? startHook.handleBlur : undefined}
          onFocus={startHook.handleFocus}
          disabled={disabled || startHook.isUpdating}
          className={cn(startHook.error && "border-destructive")}
        />
        <span className="text-muted-foreground">→</span>
        <Input
          type="date"
          data-entity={entity}
          data-entity-id={entityId}
          data-field={String(endField)}
          value={endHook.localValue}
          onChange={(e) => endHook.handleChange(e.target.value)}
          onBlur={saveMode === "auto" ? endHook.handleBlur : undefined}
          onFocus={endHook.handleFocus}
          disabled={disabled || endHook.isUpdating}
          className={cn(endHook.error && "border-destructive")}
        />
      </div>
      {startHook.error && <p className="text-sm text-destructive">{startHook.error}</p>}
      {endHook.error && <p className="text-sm text-destructive">{endHook.error}</p>}
    </div>
  );
}

// ============================================================================
// EDITABLE RICH TEXT (упрощённая версия - textarea с форматированием)
// ============================================================================

interface EditableRichTextProps<E extends EntityType> {
  entity: E;
  entityId: string;
  field: keyof EntityDataMap[E];
  value: string | undefined | null;
  
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  
  saveMode?: "auto" | "manual" | "hybrid";
  debounceMs?: number;
  
  rows?: number;
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EditableRichText<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  label,
  placeholder,
  className,
  disabled = false,
  saveMode = "auto",
  debounceMs = 1000,
  rows = 10,
  onSuccess,
  onError,
}: EditableRichTextProps<E>) {
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
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <textarea
        data-entity={entity}
        data-entity-id={entityId}
        data-field={String(field)}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={saveMode === "auto" ? handleBlur : undefined}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled || isUpdating}
        rows={rows}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive"
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// EDITABLE FILE UPLOAD
// ============================================================================

interface EditableFileUploadProps<E extends EntityType> {
  entity: E;
  entityId: string;
  field: keyof EntityDataMap[E];
  value: string | undefined | null; // URL файла
  
  label?: string;
  className?: string;
  disabled?: boolean;
  accept?: string;
  
  saveMode?: "auto" | "manual" | "hybrid";
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onUpload?: (file: File) => Promise<string>; // Callback для загрузки файла
}

export function EditableFileUpload<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  label,
  className,
  disabled = false,
  accept,
  saveMode = "auto",
  onSuccess,
  onError,
  onUpload,
}: EditableFileUploadProps<E>) {
  const { localValue, isUpdating, error, handleChange, handleFocus } = useEditableField({
    entity,
    entityId,
    field,
    value: value || "",
    debounceMs: 0,
    saveMode,
    onSuccess,
    onError,
  });
  
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    
    setUploading(true);
    try {
      const url = await onUpload(file);
      handleChange(url);
    } catch (err: any) {
      onError?.(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUpdating || uploading}
          onFocus={handleFocus}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
        
        {localValue && (
          <a
            href={localValue}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate max-w-xs"
          >
            {localValue.split("/").pop()}
          </a>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        data-entity={entity}
        data-entity-id={entityId}
        data-field={String(field)}
      />
      
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// EDITABLE IMAGE UPLOAD
// ============================================================================

interface EditableImageUploadProps<E extends EntityType> {
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
  onUpload?: (file: File) => Promise<string>;
}

export function EditableImageUpload<E extends EntityType>({
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
  onUpload,
}: EditableImageUploadProps<E>) {
  const { localValue, isUpdating, error, handleChange, handleFocus } = useEditableField({
    entity,
    entityId,
    field,
    value: value || "",
    debounceMs: 0,
    saveMode,
    onSuccess,
    onError,
  });
  
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    
    setUploading(true);
    try {
      const url = await onUpload(file);
      handleChange(url);
    } catch (err: any) {
      onError?.(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      
      <div className="space-y-2">
        {localValue ? (
          <div className="relative w-full max-w-xs">
            <img
              src={localValue}
              alt="Uploaded"
              className="rounded-lg border w-full h-auto object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => handleChange("")}
              disabled={disabled || isUpdating}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : "Click to upload image"}
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          onFocus={handleFocus}
          className="hidden"
          data-entity={entity}
          data-entity-id={entityId}
          data-field={String(field)}
        />
      </div>
      
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// MANY-TO-MANY TAGS
// ============================================================================

interface ManyToManyTagsProps<E extends EntityType> {
  entity: E;
  entityId: string;
  field: keyof EntityDataMap[E];
  value: string[] | undefined | null;
  
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  
  availableTags: Array<{ id: string; name: string }>;
  
  saveMode?: "auto" | "manual" | "hybrid";
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function ManyToManyTags<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  label,
  placeholder = "Add tags...",
  className,
  disabled = false,
  availableTags,
  saveMode = "auto",
  onSuccess,
  onError,
}: ManyToManyTagsProps<E>) {
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
  
  const handleAdd = (tagId: string) => {
    if (!localValue.includes(tagId)) {
      handleChange([...localValue, tagId]);
    }
  };
  
  const handleRemove = (tagId: string) => {
    handleChange(localValue.filter((id: string) => id !== tagId));
  };
  
  const unusedTags = availableTags.filter((tag) => !localValue.includes(tag.id));
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      
      {/* Selected tags */}
      {localValue.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {localValue.map((tagId: string) => {
            const tag = availableTags.find((t) => t.id === tagId);
            return (
              <Badge key={tagId} variant="secondary">
                {tag?.name || tagId}
                <button
                  type="button"
                  onClick={() => handleRemove(tagId)}
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
      
      {/* Available tags */}
      {unusedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unusedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleAdd(tag.id)}
              onFocus={handleFocus}
              data-entity={entity}
              data-entity-id={entityId}
              data-field={String(field)}
            >
              + {tag.name}
            </Badge>
          ))}
        </div>
      )}
      
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// REFERENCE PICKER (для связей FK)
// ============================================================================

interface ReferencePickerProps<E extends EntityType> {
  entity: E;
  entityId: string;
  field: keyof EntityDataMap[E];
  value: string | undefined | null;
  
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  
  options: Array<{ id: string; label: string }>;
  
  saveMode?: "auto" | "manual" | "hybrid";
  
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function ReferencePicker<E extends EntityType>({
  entity,
  entityId,
  field,
  value,
  label,
  placeholder = "Select...",
  className,
  disabled = false,
  options,
  saveMode = "auto",
  onSuccess,
  onError,
}: ReferencePickerProps<E>) {
  const { localValue, isUpdating, error, handleChange, handleFocus } = useEditableField({
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
      {label && <Label>{label}</Label>}
      
      <select
        data-entity={entity}
        data-entity-id={entityId}
        data-field={String(field)}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        disabled={disabled || isUpdating}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive"
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
