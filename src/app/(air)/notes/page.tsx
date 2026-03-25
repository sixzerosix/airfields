// app/notes/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotesList, NotesTable } from "./NotesList";
import { NotesSimple } from "./NotesListDragSimple";

export default async function NotesPage() {
	const supabase = await createServerSupabaseClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return <div>Please sign in</div>;

	// Fetch notes
	const { data: notes } = await supabase
		.from("notes")
		.select("*")
		.order("updated_at", { ascending: false });

	// Передаём ДАННЫЕ, не функцию!
	return (
		<>
			{/* <NotesList initialNotes={notes || []} /> */}
			{/* <NotesTable initialNotes={notes || []} /> */}
			<NotesSimple initialNotes={notes || []} />
		</>
	);
}
