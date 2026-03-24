// app/notes/page.tsx
import { createServerSupabaseClient } from "@/_airfields/lib/supabase/server";
import { NotesList } from "./notes";

export default async function PageNotes() {
	const supabase = await createServerSupabaseClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return (
			<div className="p-10 text-center">
				Пожалуйста, войдите в аккаунт
			</div>
		);
	}

	const { data: notes } = await supabase
		.from("notes")
		.select("id, title, description, updated_at")
		.order("updated_at", { ascending: false });

	return <NotesList initialNotes={notes || []} />;
}
