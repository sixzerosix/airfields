// app/notes/[id]/page.tsx
import { EntityPage } from "@/components/entity/EntityPage";
import { EntityEditor } from "@/components/entity/EntityEditor";
import { EntityField } from "@/components/entity/EntityField";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function PageNote({ params }: PageProps) {
	return (
		<EntityPage entity="notes" params={params}>
			{(note) => (
				<div className="max-w-5xl mx-auto">
					<EntityEditor
						entity="notes"
						entityId={note.id}
						initialData={note}
					>
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
			)}
		</EntityPage>
	);
}
