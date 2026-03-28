"use client";

/**
 * EditableTags — M2M тег-пикер
 *
 * ✅ Realtime: подписка на entity_tags → синхронизация между вкладками
 * ✅ Create: кнопка "Create tag" в dropdown + Enter для быстрого создания
 * ✅ Draft mode: хранит tag IDs в Store
 * ✅ entity_type скоуп: теги notes ≠ теги tasks
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Plus } from "lucide-react";
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
	showCreateButton?: boolean;
	createOnEnter?: boolean;
	enableRealtime?: boolean;
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// HELPER: программная очистка input
// ============================================================================
// React не реагирует на input.value = "" если input uncontrolled.
// Нужно через нативный setter чтобы React увидел изменение.

function clearNativeInput(input: HTMLInputElement) {
	const nativeSetter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		"value",
	)?.set;

	if (nativeSetter) {
		nativeSetter.call(input, "");
		input.dispatchEvent(new Event("input", { bubbles: true }));
	} else {
		input.value = "";
	}
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
	showCreateButton = true,
	createOnEnter = true,
	enableRealtime = true,
	onSuccess,
	onError,
}: EditableTagsProps<E>) {
	const isDraft = useIsDraft();
	const anchor = useComboboxAnchor();
	const inputRef = useRef<HTMLInputElement>(null);

	const [allTags, setAllTags] = useState<Tag[]>([]);
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [isCreatingTag, setIsCreatingTag] = useState(false);

	// Ref чтобы realtime callback видел актуальный entityId
	const entityIdRef = useRef(entityId);
	entityIdRef.current = entityId;

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
				.eq("entity_type", entity)
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
	// REALTIME
	// ==========================================================================
	// ⚠️ Supabase Realtime НЕ поддерживает фильтры для DELETE events
	// (filter работает только на NEW record, а DELETE отправляет OLD).
	// Поэтому подписываемся БЕЗ фильтра и проверяем entity_id в callback.

	useEffect(() => {
		if (isDraft || !enableRealtime) return;

		const supabase = getSupabaseClient();

		const channel = supabase
			.channel(`entity-tags:${entity}:${entityId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "entity_tags",
					// НЕТ filter — Supabase не фильтрует DELETE по OLD values
				},
				(payload) => {
					console.log(
						"[Realtime] payload:",
						JSON.stringify(payload, null, 2),
					);
					const currentEntityId = entityIdRef.current;

					if (payload.eventType === "INSERT") {
						const row = payload.new as any;
						// Проверяем что это наша сущность
						if (
							row.entity_type === entity &&
							row.entity_id === currentEntityId
						) {
							setSelectedTagIds((prev) =>
								prev.includes(row.tag_id)
									? prev
									: [...prev, row.tag_id],
							);
						}
					} else if (payload.eventType === "DELETE") {
						// Тихий refetch — без isLoading, без мерцания
						const supabase = getSupabaseClient();
						supabase
							.from("entity_tags")
							.select("tag_id")
							.eq("entity_type", entity)
							.eq("entity_id", entityIdRef.current)
							.then(({ data }) => {
								if (data) {
									setSelectedTagIds(
										data.map((et) => et.tag_id),
									);
								}
							});
					}
				},
			)
			.subscribe();

		// Подписка на новые теги
		const tagsChannel = supabase
			.channel(`tags:${entity}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "tags",
				},
				(payload) => {
					console.log(
						"[Realtime] payload:",
						JSON.stringify(payload, null, 2),
					);

					const newTag = payload.new as Tag & { entity_type: string };

					if (newTag.entity_type === entity) {
						setAllTags((prev) =>
							prev.some((t) => t.id === newTag.id)
								? prev
								: [
										...prev,
										{
											id: newTag.id,
											name: newTag.name,
											color: newTag.color,
										},
									],
						);
					}
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
			supabase.removeChannel(tagsChannel);
		};
	}, [entity, entityId, isDraft, enableRealtime]);

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
	// CLEAR INPUT
	// ==========================================================================

	const clearInput = useCallback(() => {
		setSearchQuery("");
		if (inputRef.current) {
			clearNativeInput(inputRef.current);
		}
	}, []);

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

	const createAndAddTag = useCallback(
		async (name: string) => {
			const trimmed = name.trim();
			if (!trimmed) return;

			const existing = allTags.find(
				(t) => t.name.toLowerCase() === trimmed.toLowerCase(),
			);
			if (existing) {
				if (!selectedTagIds.includes(existing.id)) {
					await addTag(existing.id);
				}
				clearInput();
				return;
			}

			setIsCreatingTag(true);
			try {
				const supabase = getSupabaseClient();
				const { data, error } = await supabase
					.from("tags")
					.insert({ name: trimmed, entity_type: entity })
					.select("id, name, color")
					.single();

				if (error) throw error;

				setAllTags((prev) => [...prev, data]);
				await addTag(data.id);
				clearInput();
			} catch (err: any) {
				if (err.code === "23505") {
					await loadAllTags();
					const found = allTags.find(
						(t) => t.name.toLowerCase() === trimmed.toLowerCase(),
					);
					if (found) await addTag(found.id);
					clearInput();
				} else {
					setError(err.message);
					onError?.(err.message);
				}
			} finally {
				setIsCreatingTag(false);
			}
		},
		[entity, allTags, selectedTagIds, addTag, clearInput, onError],
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
				const tag = allTags.find((t) => t.name === name);
				if (tag) await addTag(tag.id);
			}

			for (const name of removed) {
				const tag = allTags.find((t) => t.name === name);
				if (tag) await removeTag(tag.id);
			}
		},
		[selectedTagNames, allTags, addTag, removeTag],
	);

	// ==========================================================================
	// SEARCH
	// ==========================================================================

	const comboboxItems = allTags.map((t) => t.name);

	const exactMatch = allTags.some(
		(t) => t.name.toLowerCase() === searchQuery.toLowerCase(),
	);
	const showCreate = allowCreate && searchQuery.trim() && !exactMatch;

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
				items={comboboxItems}
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
								<ComboboxChipsInput
									ref={inputRef}
									placeholder={placeholder}
									onChange={(
										e: React.ChangeEvent<HTMLInputElement>,
									) => {
										setSearchQuery(e.target.value);
									}}
									onKeyDown={(e: React.KeyboardEvent) => {
										if (
											createOnEnter &&
											e.key === "Enter" &&
											showCreate &&
											!isCreatingTag
										) {
											e.preventDefault();
											createAndAddTag(searchQuery);
										}
									}}
								/>
							</>
						)}
					</ComboboxValue>
				</ComboboxChips>

				<ComboboxContent
					anchor={anchor}
					className={"pointer-events-auto"}
				>
					<ComboboxEmpty>
						{showCreate ? null : "No tags found"}
					</ComboboxEmpty>

					<ComboboxList>
						{(item: string) => {
							const tag = allTags.find((t) => t.name === item);
							return (
								<ComboboxItem key={item} value={item}>
									<div className="flex items-center gap-2">
										{tag?.color && (
											<div
												className="w-2.5 h-2.5 rounded-full flex-shrink-0"
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

					{showCreate && showCreateButton && (
						<div className="p-1 border-t">
							<button
								type="button"
								className={cn(
									"w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm",
									"hover:bg-accent hover:text-accent-foreground",
									"cursor-pointer",
								)}
								disabled={isCreatingTag}
								onPointerDown={(e) => {
									e.preventDefault();
								}}
								onClick={() => createAndAddTag(searchQuery)}
							>
								<Plus className="h-3.5 w-3.5" />
								<span>
									{isCreatingTag
										? "Creating..."
										: `Create "${searchQuery.trim()}"`}
								</span>
							</button>
						</div>
					)}
				</ComboboxContent>
			</Combobox>

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
