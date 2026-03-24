import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/_airfields/lib/supabase/server";
import { NoteEditor } from "@/components/editors/note-editor";

interface PageProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function PageNote({ params }: PageProps) {
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
		// или redirect('/login')
	}

	const { id } = await params;

	const { data: note, error } = await supabase
		.from("notes")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		console.error("Ошибка Supabase:", error);
		return (
			<div className="p-6 text-red-600">Не удалось загрузить заметки</div>
		);
	}

	if (!note) {
		return (
			<div className="p-6 text-center text-muted-foreground">
				Заметок пока нет. Создайте первую!
			</div>
		);
	}
	return <NoteEditor initialData={note} noteId={id} />;
}
