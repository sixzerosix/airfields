"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EntityList } from "@/components/entity/EntityList";
import { EntityField } from "@/components/entity/EntityField";
import { EntityEditor } from "@/components/entity/EntityEditor";
import { CreateEntityDialog } from "@/components/entity/CreateEntityDialog";
import type { Note } from "@/lib/schemas";

// import { useEntityList } from "@/hooks/useEntityList";

// export function NotesTable({ initialNotes }: { initialNotes: Note[] }) {
// 	const notes = useEntityList("notes", initialNotes);

// 	// Полная свобода в layout — хук не навязывает ничего
// 	return (
// 		<table className="w-full">
// 			<thead>
// 				<tr>
// 					<th>Title</th>
// 					<th>Status</th>
// 					<th>Updated</th>
// 				</tr>
// 			</thead>
// 			<tbody>
// 				{notes.map((note) => (
// 					<tr key={note.id}>
// 						<td>{note.title}</td>
// 						<td>
// 							<EntityEditor
// 								entity="notes"
// 								entityId={note.id}
// 								initialData={note}
// 							>
// 								<EntityField
// 									entity="notes"
// 									entityId={note.id}
// 									name="status"
// 								/>
// 							</EntityEditor>
// 						</td>
// 						<td>
// 							{new Date(note.updated_at).toLocaleDateString()}
// 						</td>
// 					</tr>
// 				))}
// 			</tbody>
// 		</table>
// 	);
// }

export function NotesList({ initialNotes }: { initialNotes: Note[] }) {
	const router = useRouter();

	return (
		<div className="max-w-5xl mx-auto p-4">
			{/* ============================================ */}
			{/* HEADER + CREATE BUTTON                       */}
			{/* ============================================ */}
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Notes</h1>

				{/* ✅ CreateEntityDialog — кнопка + модалка */}
				<CreateEntityDialog
					entity="notes"
					trigger={
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							New Note
						</Button>
					}
					title="Create Note"
					onSuccess={(id) => router.push(`/notes/${id}`)}
				>
					{/* ✅ Render prop — tempId доступен! */}
					{(tempId) => (
						<>
							<EntityField
								entity="notes"
								entityId={tempId}
								name="title"
							/>
							<EntityField
								entity="notes"
								entityId={tempId}
								name="description"
							/>
						</>
					)}
				</CreateEntityDialog>
			</div>

			{/* ============================================ */}
			{/* LIST                                         */}
			{/* ============================================ */}
			<EntityList
				entity="notes"
				initialData={initialNotes}
				className="grid gap-3"
				empty={
					<p className="text-center text-muted-foreground py-12">
						Заметок пока нет. Создайте первую!
					</p>
				}
			>
				{(note) => (
					<EntityEditor
						entity="notes"
						entityId={note.id}
						initialData={note}
					>
						<div className="flex items-center justify-between p-4 border rounded-xl">
							<Link href={`/notes/${note.id}`}>
								<span className="font-medium">
									{note.title}
								</span>
								<div className="text-sm text-muted-foreground">
									{note.description}
								</div>
							</Link>

							{/* ✅ Только статус — редактируемый */}
							<EntityField
								entity="notes"
								entityId={note.id}
								name="status"
								customProps={{ label: "" }}
							/>
						</div>
					</EntityEditor>
				)}
			</EntityList>
		</div>
	);
}
