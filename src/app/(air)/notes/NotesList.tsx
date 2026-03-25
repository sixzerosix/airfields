"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { EntityList } from "@/components/entity/EntityList";
import { EntityField } from "@/components/entity/EntityField";
import { EntityEditor } from "@/components/entity/EntityEditor";
import { CreateEntityDialog } from "@/components/entity/CreateEntityDialog";
import type { Note } from "@/lib/schemas";
import { EditEntityDialog } from "@/components/entity/EditEntityDialog";
import { useState } from "react";
import { DeleteEntityButton } from "@/components/entity/DeleteEntityButton";
import { CreateEntityInline } from "@/components/entity/CreateEntityInline";

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

function SomeClientComponent() {
	return (
		<CreateEntityDialog
			entity="notes"
			trigger={
				<Button>
					<Plus className="w-4 h-4 mr-2" />
					New Note
				</Button>
			}
			title="Create Note"
			initialValues={{ status: "todo" }}
			onSuccess={(id) => console.log("Created:", id)}
		>
			{(tempId) => (
				<>
					{/* ✅ Просто EntityField — saveMode="manual" автоматически */}
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
	);
}

export function NotesList({ initialNotes }: { initialNotes: Note[] }) {
	// ✅ ОДИН state для управления Dialog
	const [editingId, setEditingId] = useState<string | null>(null);

	return (
		<div className="max-w-5xl mx-auto p-4">
			{/* ============================================ */}
			{/* HEADER + CREATE BUTTON                       */}
			{/* ============================================ */}
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Notes</h1>

				<SomeClientComponent />
			</div>
			{/* ✅ Inline creation — раскрывается над списком */}
			<CreateEntityInline
				entity="notes"
				initialValues={{ status: "todo" }}
				alwaysOpen={true}
				submitText="Add Note"
			>
				{(tempId) => (
					<div className="grid gap-3">
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
					</div>
				)}
			</CreateEntityInline>

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
						<div className="flex items-center justify-between p-4 border rounded-xl gap-3">
							<Link href={`/notes/${note.id}`} className="flex-1">
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
								className="min-w-[120px]"
							/>

							<Button
								variant="ghost"
								size="icon"
								onClick={() => setEditingId(note.id)}
							>
								<Pencil className="w-4 h-4" />
							</Button>
							<DeleteEntityButton
								entity="notes"
								entityId={note.id}
								confirm={false}
								size="icon"
								variant="ghost"
								label=""
							/>
						</div>
					</EntityEditor>
				)}
			</EntityList>

			{/* ✅ ОДИН Dialog на весь список — монтируется 1 раз */}
			<EditEntityDialog
				entity="notes"
				entityId={editingId}
				onClose={() => setEditingId(null)}
				title="Edit Note"
				footer={(id) => (
					<div className="flex justify-between w-full">
						{/* Delete — слева */}
						<DeleteEntityButton
							entity="notes"
							entityId={id}
							variant="outline"
							size="sm"
							confirmTitle="Delete this note?"
							confirmDescription="This action cannot be undone."
							onSuccess={() => setEditingId(null)}
						/>

						{/* Можно добавить другие кнопки справа */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setEditingId(null)}
						>
							Close
						</Button>
					</div>
				)}
			>
				{(id) => (
					<>
						<EntityField
							entity="notes"
							entityId={id}
							name="title"
						/>
						<EntityField
							entity="notes"
							entityId={id}
							name="description"
						/>
						<EntityField
							entity="notes"
							entityId={id}
							name="status"
						/>
					</>
				)}
			</EditEntityDialog>
		</div>
	);
}
