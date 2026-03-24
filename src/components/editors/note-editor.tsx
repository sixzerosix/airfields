"use client";

/**
 * CLIENT COMPONENT - Task Editor
 *
 * UI и интерактивность (выполняется на клиенте)
 *
 * Получает данные от Server Component
 * Управляет:
 * - Real-time подписками
 * - Локальным состоянием
 * - UI обновлениями
 */
import { EntityField } from "@/components/EntityField";
import { useEffect, useRef } from "react";
import { useStore, selectEntity } from "@/lib/store";
import { subscribeToEntity } from "@/lib/supabase/realtime";

import type { Note } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface NoteEditorProps {
	initialData: Note;
	noteId: string;
}

export function NoteEditor({ initialData, noteId }: NoteEditorProps) {
	// ========================================================================
	// ИНИЦИАЛИЗАЦИЯ STORE
	// ========================================================================

	const initialized = useRef(false);

	if (!initialized.current) {
		// Поместить данные из сервера в store
		useStore.getState().upsertEntity("notes", noteId, initialData);
		initialized.current = true;
	}

	// ========================================================================
	// STORE SUBSCRIPTION
	// ========================================================================

	// Подписка на обновления из store
	const note = useStore((state) => selectEntity(state, "notes", noteId));

	// ========================================================================
	// REAL-TIME SUBSCRIPTION
	// ========================================================================

	useEffect(() => {
		console.log(
			"[NoteEditor] Setting up real-time subscription for:",
			noteId,
		);

		const unsubscribe = subscribeToEntity("notes", {
			column: "id",
			value: noteId,
		});

		return () => {
			console.log("[NoteEditor] Cleaning up real-time subscription");
			unsubscribe();
		};
	}, [noteId]); // ← Добавь dependency!

	// ========================================================================
	// FALLBACK
	// ========================================================================

	if (!note) {
		return (
			<div className="max-w-2xl mx-auto p-6">
				<p className="text-center text-muted-foreground">Loading...</p>
			</div>
		);
	}

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div className="max-w-5xl mx-auto grid gap-2">
			<div className="">
				<div className="text-xl">{note?.title}</div>
				<div className="text-muted-foreground">{note?.description}</div>
				<EntityField
					entity="notes"
					entityId={note.id}
					name="title"
					value={note?.title}
				/>

				<EntityField
					entity="notes"
					entityId={note.id}
					name="description"
					value={note?.description}
				/>
			</div>
		</div>
	);
}
