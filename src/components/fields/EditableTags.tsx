"use client";

/**
 * EditableTags — M2M тег-пикер
 *
 * Draft mode: хранит tag IDs в Store → useEntityDraft читает через getM2MFields()
 * Normal mode: INSERT/DELETE в entity_tags напрямую
 */

import { useState, useEffect, useCallback } from "react";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { useIsDraft } from "@/contexts/DraftContext";
import type { EntityType } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface Tag {
	id: string;
	name: string;
	color: string;
}

interface EditableTagsProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: string;
	value?: string[];
	label?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	allowCreate?: boolean;
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditableTags<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	label,
	placeholder = "Add tags...",
	className,
	disabled = false,
	allowCreate = true,
	onSuccess,
	onError,
}: EditableTagsProps<E>) {
	const isDraft = useIsDraft();
	const anchor = useComboboxAnchor();

	const [allTags, setAllTags] = useState<Tag[]>([]);
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// ==========================================================================
	// LOAD
	// ==========================================================================

	useEffect(() => {
		loadAllTags();

		if (!isDraft) {
			loadEntityTags();
		} else {
			const storeData = useStore.getState().entities[entity]?.[entityId];
			const storedTags = (storeData as any)?.[field];
			if (Array.isArray(storedTags)) {
				setSelectedTagIds(storedTags);
			}
			setIsLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [entity, entityId, isDraft]);

	const loadAllTags = async () => {
		try {
			const supabase = getSupabaseClient();
			const { data, error } = await supabase
				.from("tags")
				.select("id, name, color")
				.eq("entity_type", entity) // ← одна строка
				.order("name");

			if (error) throw error;
			setAllTags(data || []);
		} catch (err: any) {
			console.error("[EditableTags] Load tags error:", err);
		}
	};

	const loadEntityTags = async () => {
		setIsLoading(true);
		try {
			const supabase = getSupabaseClient();
			const { data, error } = await supabase
				.from("entity_tags")
				.select("tag_id")
				.eq("entity_type", entity)
				.eq("entity_id", entityId);

			if (error) throw error;
			setSelectedTagIds((data || []).map((et) => et.tag_id));
		} catch (err: any) {
			console.error("[EditableTags] Load entity tags error:", err);
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	// ==========================================================================
	// SYNC TO STORE (draft mode)
	// ==========================================================================

	const syncToStore = useCallback(
		(tagIds: string[]) => {
			if (!isDraft) return;
			useStore
				.getState()
				.updateField(entity, entityId, field as any, tagIds);
		},
		[isDraft, entity, entityId, field],
	);

	// ==========================================================================
	// ADD / REMOVE
	// ==========================================================================

	const addTag = useCallback(
		async (tagId: string) => {
			const newIds = [...selectedTagIds, tagId];
			setSelectedTagIds(newIds);

			if (isDraft) {
				syncToStore(newIds);
				return;
			}

			try {
				const supabase = getSupabaseClient();
				const { error } = await supabase.from("entity_tags").insert({
					tag_id: tagId,
					entity_type: entity,
					entity_id: entityId,
				});
				if (error) throw error;
				onSuccess?.();
			} catch (err: any) {
				setSelectedTagIds(selectedTagIds);
				setError(err.message);
				onError?.(err.message);
			}
		},
		[
			entity,
			entityId,
			isDraft,
			selectedTagIds,
			syncToStore,
			onSuccess,
			onError,
		],
	);

	const removeTag = useCallback(
		async (tagId: string) => {
			const newIds = selectedTagIds.filter((id) => id !== tagId);
			setSelectedTagIds(newIds);

			if (isDraft) {
				syncToStore(newIds);
				return;
			}

			try {
				const supabase = getSupabaseClient();
				const { error } = await supabase
					.from("entity_tags")
					.delete()
					.eq("tag_id", tagId)
					.eq("entity_type", entity)
					.eq("entity_id", entityId);
				if (error) throw error;
				onSuccess?.();
			} catch (err: any) {
				setSelectedTagIds([...selectedTagIds, tagId]);
				setError(err.message);
				onError?.(err.message);
			}
		},
		[
			entity,
			entityId,
			isDraft,
			selectedTagIds,
			syncToStore,
			onSuccess,
			onError,
		],
	);

	// ==========================================================================
	// CREATE NEW TAG
	// ==========================================================================

	const createTag = useCallback(
		async (name: string): Promise<string | null> => {
			try {
				const supabase = getSupabaseClient();
				const { data, error } = await supabase
					.from("tags")
					.insert({ name: name.trim(), entity_type: entity })
					.select("id, name, color")
					.single();

				if (error) throw error;
				setAllTags((prev) => [...prev, data]);
				return data.id;
			} catch (err: any) {
				if (err.code === "23505") {
					const existing = allTags.find(
						(t) => t.name.toLowerCase() === name.toLowerCase(),
					);
					return existing?.id || null;
				}
				setError(err.message);
				onError?.(err.message);
				return null;
			}
		},
		[allTags, onError],
	);

	// ==========================================================================
	// COMBOBOX HANDLER
	// ==========================================================================

	const selectedTagNames = selectedTagIds
		.map((id) => allTags.find((t) => t.id === id)?.name)
		.filter(Boolean) as string[];

	const handleValueChange = useCallback(
		async (newNames: string[]) => {
			const prevNames = selectedTagNames;
			const added = newNames.filter((n) => !prevNames.includes(n));
			const removed = prevNames.filter((n) => !newNames.includes(n));

			for (const name of added) {
				let tag = allTags.find((t) => t.name === name);
				if (!tag && allowCreate) {
					const newId = await createTag(name);
					if (newId) await addTag(newId);
				} else if (tag) {
					await addTag(tag.id);
				}
			}

			for (const name of removed) {
				const tag = allTags.find((t) => t.name === name);
				if (tag) await removeTag(tag.id);
			}
		},
		[selectedTagNames, allTags, allowCreate, addTag, removeTag, createTag],
	);

	// ==========================================================================
	// RENDER
	// ==========================================================================

	if (isLoading) {
		return (
			<div className={cn("space-y-2", className)}>
				{label && <Label>{label}</Label>}
				<div className="h-10 bg-muted animate-pulse rounded-md" />
			</div>
		);
	}

	return (
		<div className={cn("space-y-2", className)}>
			{label && <Label>{label}</Label>}

			<Combobox
				multiple
				autoHighlight
				items={allTags.map((t) => t.name)}
				value={selectedTagNames}
				onValueChange={handleValueChange}
				disabled={disabled}
			>
				<ComboboxChips ref={anchor} className="w-full">
					<ComboboxValue>
						{(values: string[]) => (
							<>
								{values.map((name: string) => {
									const tag = allTags.find(
										(t) => t.name === name,
									);
									return (
										<ComboboxChip
											key={name}
											style={
												tag?.color
													? {
															backgroundColor: `${tag.color}20`,
															borderColor: `${tag.color}40`,
															color: tag.color,
														}
													: undefined
											}
										>
											{name}
										</ComboboxChip>
									);
								})}
								<ComboboxChipsInput placeholder={placeholder} />
							</>
						)}
					</ComboboxValue>
				</ComboboxChips>

				<ComboboxContent anchor={anchor}>
					<ComboboxEmpty>
						{allowCreate
							? "Type to create a new tag"
							: "No tags found"}
					</ComboboxEmpty>
					<ComboboxList>
						{(item: string) => {
							const tag = allTags.find((t) => t.name === item);
							return (
								<ComboboxItem key={item} value={item}>
									<div className="flex items-center gap-2">
										{tag?.color && (
											<div
												className="w-2.5 h-2.5 rounded-full"
												style={{
													backgroundColor: tag.color,
												}}
											/>
										)}
										<span>{item}</span>
									</div>
								</ComboboxItem>
							);
						}}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
