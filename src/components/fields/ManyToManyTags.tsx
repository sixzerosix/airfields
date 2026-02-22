"use client";

/**
 * MANY-TO-MANY TAGS COMPONENT
 *
 * Компонент для работы с тегами через junction table
 *
 * Архитектура:
 * tasks ↔ task_tags ↔ tags
 * projects ↔ project_tags ↔ tags
 *
 * Особенности:
 * - Загружает теги из таблицы tags
 * - Сохраняет связи через junction table
 * - Поддерживает создание новых тегов
 * - Real-time синхронизация
 */

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

// ============================================================================
// TYPES
// ============================================================================
interface Tag {
	id: string;
	name: string;
	slug: string;
	color: string;
	icon?: string | null;
	description?: string | null;
}

interface ManyToManyTagsProps {
	// Entity configuration
	entityType: "tasks" | "projects"; // Тип сущности
	entityId: string; // ID сущности

	// UI
	label?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;

	// Limits
	maxSelections?: number;

	// Callbacks
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ManyToManyTags({
	entityType,
	entityId,
	label = "Tags",
	placeholder = "Add tags...",
	className,
	disabled = false,
	maxSelections,
	onSuccess,
	onError,
}: ManyToManyTagsProps) {
	// ========================================================================
	// STATE
	// ========================================================================

	const [allTags, setAllTags] = useState<Tag[]>([]);
	const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
	const [isLoadingTags, setIsLoadingTags] = useState(true);
	const [isLoadingSelection, setIsLoadingSelection] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [open, setOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const supabase = getSupabaseClient();

	// Junction table name
	const junctionTable = `${entityType.slice(0, -1)}_tags`; // tasks → task_tags
	const entityIdField = `${entityType.slice(0, -1)}_id`; // tasks → task_id

	// ========================================================================
	// LOAD ALL TAGS
	// ========================================================================

	useEffect(() => {
		async function loadAllTags() {
			try {
				const { data, error } = await supabase
					.from("tags")
					.select("*")
					.order("name", { ascending: true });

				if (error) throw error;

				setAllTags(data || []);
			} catch (err) {
				console.error("[ManyToManyTags] Error loading tags:", err);
				onError?.("Failed to load tags");
			} finally {
				setIsLoadingTags(false);
			}
		}

		loadAllTags();
	}, []);

	// ========================================================================
	// LOAD SELECTED TAGS
	// ========================================================================

	useEffect(() => {
		async function loadSelectedTags() {
			try {
				const { data, error } = await supabase
					.from(junctionTable)
					.select(
						`
            tag_id,
            tags (*)
          `,
					)
					.eq(entityIdField, entityId);

				if (error) throw error;

				const tags =
					data?.map((item: any) => item.tags).filter(Boolean) || [];

				setSelectedTags(tags);
			} catch (err) {
				console.error(
					"[ManyToManyTags] Error loading selected tags:",
					err,
				);
			} finally {
				setIsLoadingSelection(false);
			}
		}

		loadSelectedTags();

		// ========================================================================
		// REAL-TIME SUBSCRIPTION
		// ========================================================================

		const channel = supabase
			.channel(`${junctionTable}:${entityId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: junctionTable,
					filter: `${entityIdField}=eq.${entityId}`,
				},
				(payload) => {
					console.log("[ManyToManyTags] Real-time change:", payload);

					// Перезагрузить теги при любом изменении
					loadSelectedTags();
				},
			)
			.subscribe();

		return () => {
			console.log("[ManyToManyTags] Unsubscribing from real-time");
			supabase.removeChannel(channel);
		};
	}, [entityType, entityId]);

	// ========================================================================
	// HANDLERS
	// ========================================================================

	const handleAddTag = async (tag: Tag) => {
		if (maxSelections && selectedTags.length >= maxSelections) {
			toast.error(`Maximum ${maxSelections} tags allowed`);
			return;
		}

		setIsSaving(true);

		try {
			// Insert into junction table
			const { error } = await supabase.from(junctionTable as any).insert({
				[entityIdField]: entityId,
				tag_id: tag.id,
			} as any);

			if (error) throw error;

			setSelectedTags([...selectedTags, tag]);
			toast.success(`Added ${tag.icon || ""} ${tag.name}`);
			onSuccess?.();
		} catch (err: any) {
			console.error("[ManyToManyTags] Error adding tag:", err);

			if (err.code === "23505") {
				toast.error("Tag already added");
			} else {
				toast.error("Failed to add tag");
				onError?.(err.message);
			}
		} finally {
			setIsSaving(false);
		}
	};

	const handleRemoveTag = async (tag: Tag) => {
		setIsSaving(true);

		try {
			// Delete from junction table
			const { error } = await supabase
				.from(junctionTable)
				.delete()
				.eq(entityIdField, entityId)
				.eq("tag_id", tag.id);

			if (error) throw error;

			setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
			toast.success(`Removed ${tag.icon || ""} ${tag.name}`);
			onSuccess?.();
		} catch (err: any) {
			console.error("[ManyToManyTags] Error removing tag:", err);
			toast.error("Failed to remove tag");
			onError?.(err.message);
		} finally {
			setIsSaving(false);
		}
	};

	// ========================================================================
	// FILTERED TAGS
	// ========================================================================

	const selectedTagIds = new Set(selectedTags.map((t) => t.id));

	const availableTags = allTags.filter((tag) => {
		const matchesSearch = tag.name
			.toLowerCase()
			.includes(searchTerm.toLowerCase());
		const notSelected = !selectedTagIds.has(tag.id);
		return matchesSearch && notSelected;
	});

	// ========================================================================
	// RENDER
	// ========================================================================

	if (isLoadingTags || isLoadingSelection) {
		return (
			<div className={cn("space-y-2", className)}>
				{label && <Label>{label}</Label>}
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					<span>Loading tags...</span>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<Label>
					{label}
					{maxSelections && (
						<span className="text-xs text-muted-foreground ml-2">
							({selectedTags.length}/{maxSelections})
						</span>
					)}
				</Label>
			)}

			<div className="space-y-2">
				{/* ============================================================== */}
				{/* SELECTED TAGS (Badges)                                        */}
				{/* ============================================================== */}

				{selectedTags.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{selectedTags.map((tag) => (
							<Badge
								key={tag.id}
								variant="secondary"
								className={cn(
									"pl-3 pr-1 gap-1",
									`bg-${tag.color}-100 text-${tag.color}-900 border-${tag.color}-200`,
								)}
							>
								{tag.icon && (
									<span className="text-sm">{tag.icon}</span>
								)}
								<span>{tag.name}</span>
								<button
									type="button"
									onClick={() => handleRemoveTag(tag)}
									disabled={disabled || isSaving}
									className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 disabled:opacity-50"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				)}

				{/* ============================================================== */}
				{/* ADD TAG BUTTON                                                */}
				{/* ============================================================== */}

				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							disabled={disabled || isSaving}
							className="w-full justify-start"
						>
							<Plus className="mr-2 h-4 w-4" />
							{placeholder}
						</Button>
					</PopoverTrigger>

					<PopoverContent className="w-[400px] p-0">
						<Command>
							<CommandInput
								placeholder="Search tags..."
								value={searchTerm}
								onValueChange={setSearchTerm}
							/>

							<CommandEmpty>
								<div className="p-4 text-sm text-center text-muted-foreground">
									No tags found
								</div>
							</CommandEmpty>

							<CommandGroup>
								{availableTags.map((tag) => (
									<CommandItem
										key={tag.id}
										value={tag.id}
										onSelect={() => {
											handleAddTag(tag);
											// НЕ закрываем popover - можно добавить несколько тегов подряд!
											// setOpen(false)
											setSearchTerm("");
										}}
									>
										<div className="flex items-center gap-3 flex-1">
											{tag.icon && (
												<span className="text-lg">
													{tag.icon}
												</span>
											)}

											<div className="flex-1">
												<div className="font-medium">
													{tag.name}
												</div>
												{tag.description && (
													<div className="text-xs text-muted-foreground">
														{tag.description}
													</div>
												)}
											</div>

											<Badge
												variant="secondary"
												className={cn(
													"text-xs",
													`bg-${tag.color}-100 text-${tag.color}-900`,
												)}
											>
												{tag.color}
											</Badge>
										</div>
									</CommandItem>
								))}
							</CommandGroup>

							{/* Кнопка Done для закрытия */}
							<div className="p-2 border-t">
								<Button
									variant="ghost"
									className="w-full"
									onClick={() => setOpen(false)}
								>
									Done
								</Button>
							</div>
						</Command>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}
