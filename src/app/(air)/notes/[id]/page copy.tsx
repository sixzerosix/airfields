// ============================================================================
// app/notes/[id]/page.tsx — Server Component
// ============================================================================
//
// Теперь работает БЕЗ render prop и БЕЗ wrapper!
// EntityField сам читает value из Store.
// ============================================================================

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EntityEditor } from "@/components/entity/EntityEditor";
import { EntityField } from "@/components/entity/EntityField";

interface PageProps {
	params: Promise<{
		id: string;
	}>;
}

export async function fetchEntity(entity: string, id: string) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from(entity)
		.select("*")
		.eq("id", id)
		.single();

	if (error) throw error;
	if (!data) throw new Error("Not found");

	return data;
}

export default async function PageNote({ params }: PageProps) {
	const { id } = await params;
	const note = await fetchEntity("notes", id);

	return (
		<div className="max-w-5xl mx-auto">
			{/* ✅ ReactNode children — НЕ функция, работает из Server Component */}
			{/* ✅ value prop не нужен — EntityField читает из Store сам */}
			<EntityEditor entity="notes" entityId={note.id} initialData={note}>
				<div className="grid gap-3">
					<EntityField
						entity="notes"
						entityId={note.id}
						name="title"
					/>

					<EntityField
						entity="notes"
						entityId={note.id}
						name="description"
					/>

					<EntityField
						entity="notes"
						entityId={note.id}
						name="status"
					/>
				</div>
			</EntityEditor>
		</div>
	);
}
