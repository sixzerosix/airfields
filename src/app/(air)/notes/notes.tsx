"use client";
import { useShallow } from "zustand/react/shallow";
import { useEffect } from "react";
import Link from "next/link";
import { useStore, selectAllEntities } from "@/lib/store";
import { subscribeToEntity } from "@/lib/supabase/realtime";
import type { Note } from "@/lib/schemas";

export function NotesList({ initialNotes }: { initialNotes: Note[] }) {
	// Инициализация Store при первом рендере
	useEffect(() => {
		const store = useStore.getState();
		initialNotes.forEach((note) => {
			store.upsertEntity("notes", note.id, note);
		});
	}, [initialNotes]);

	// Подписка на ВСЕ изменения в таблице notes
	useEffect(() => {
		console.log("[NotesList] Subscribing to all notes changes");

		const unsubscribe = subscribeToEntity("notes"); // ← без фильтра!

		return () => {
			console.log("[NotesList] Unsubscribing from notes");
			unsubscribe();
		};
	}, []);

	// Получаем актуальные данные из Store
	const notes = useStore(
		useShallow((state) => selectAllEntities(state, "notes")),
	);

	return (
		<div className="max-w-5xl mx-auto grid gap-3 p-4">
			{notes.length === 0 && (
				<p className="text-center text-muted-foreground">
					Заметок пока нет
				</p>
			)}

			{notes.map((note) => (
				<div
					key={note.id}
					className="p-4 border rounded-xl hover:border-primary/50 transition-colors"
				>
					<Link
						href={`/notes/${note.id}`}
						className="block space-y-1"
					>
						<div className="text-lg font-medium">{note.title}</div>
						{note.description && (
							<div className="text-sm text-muted-foreground line-clamp-2">
								{note.description}
							</div>
						)}
					</Link>
				</div>
			))}
		</div>
	);
}
