import { createServerSupabaseClient } from "@/_airfields/lib/supabase/server";

import Link from "next/link";

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
		// или redirect('/login')
	}

	const { data: notes, error } = await supabase
		.from("notes")
		.select("id, title, description")
		.order("updated_at", { ascending: false });

	if (error) {
		console.error("Ошибка Supabase:", error);
		return (
			<div className="p-6 text-red-600">Не удалось загрузить заметки</div>
		);
	}

	if (!notes || notes.length === 0) {
		return (
			<div className="p-6 text-center text-muted-foreground">
				Заметок пока нет. Создайте первую!
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto grid gap-2">
			{notes.map((note) => (
				<div key={note.id} className="p-3 border rounded-xl">
					<Link className="grid" href={`notes/${note.id}`}>
						<div className="text-lg">{note.title}</div>
						<div className="text-sm text-muted-foreground">
							{note.description}
						</div>
					</Link>
				</div>
			))}
		</div>
	);
}
