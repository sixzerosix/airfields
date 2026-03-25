"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { EntityList } from "@/components/entity/EntityList";
import { EntityField } from "@/components/entity/EntityField";
import { EntityEditor } from "@/components/entity/EntityEditor";
import { CreateEntityDialog } from "@/components/entity/CreateEntityDialog";
import type { Note } from "@/lib/schemas";
import { EditEntityDialog } from "@/components/entity/EditEntityDialog";
import { useState } from "react";
import { DeleteEntityButton } from "@/components/entity/DeleteEntityButton";
import { CreateEntityInline } from "@/components/entity/CreateEntityInline";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useEntityList } from "@/hooks/useEntityList";
import { EntityToolbar } from "@/components/entity/EntityToolbar";
import { STATUS_NOTE_OPTIONS } from "@/lib/registry";
import { useEntityPagination } from "@/hooks/useEntityPagination";
import { EntityPagination } from "@/components/entity/EntityPagination";
import { useEntityReorder } from "@/hooks/useEntityReorder";

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

	// ✅ Хук фильтрации
	const filters = useEntityFilters({
		filterFields: [
			{
				field: "title",
				label: "Title",
				type: "text",
				placeholder: "Search by title...",
			},
			{
				field: "status",
				label: "Status",
				type: "select",
				options: STATUS_NOTE_OPTIONS,
			},
			// Примеры других типов:
			// { field: "priority", label: "Priority", type: "number" },
			{ field: "created_at", label: "Created", type: "date" },
			// { field: "is_archived", label: "Archived", type: "boolean" },
		],
		sortFields: [
			{ field: "created_at", label: "Date Created" },
			{ field: "updated_at", label: "Last Updated" },
			{ field: "title", label: "Title" },
			{ field: "status", label: "Status" },
		],
		defaultSort: { field: "created_at", direction: "desc" },
	});

	// const pagination = useEntityPagination({
	// 	mode: "loadMore",
	// 	defaultPerPage: 4,
	// });

	// const pagination = useEntityPagination({
	// 	mode: "infinite",
	// 	defaultPerPage: 8,
	// });

	// Данные из Store + realtime
	const rawItems = useEntityList("notes", initialNotes);

	// ✅ Применяем фильтры + сортировку
	const filteredItems = filters.applyTo(rawItems);

	// Reorder
	const reorder = useEntityReorder("notes", filteredItems);

	// Сортировка: drag ON = position, drag OFF = фильтры
	const sortedItems = reorder.enabled
		? reorder.sortByPosition(filteredItems)
		: filteredItems;

	// Пагинация
	const pagination = useEntityPagination({
		mode: "pages",
		defaultPerPage: 5,
		perPageOptions: [5, 10, 25, 50, 100],
	});
	const paginated = pagination.paginate(sortedItems);

	return (
		<div className="max-w-5xl mx-auto p-4 grid gap-3">
			{/* ============================================ */}
			{/* HEADER + CREATE BUTTON                       */}
			{/* ============================================ */}
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Notes</h1>

				<SomeClientComponent />
			</div>

			<div>
				{/* ✅ Inline creation — раскрывается над списком */}
				<CreateEntityInline
					entity="notes"
					initialValues={{ status: "todo" }}
					alwaysOpen={false}
					autoClose={false}
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
			</div>

			{/* ✅ Toolbar с фильтрами и сортировкой */}
			<EntityToolbar {...filters} searchPlaceholder="Search notes..." />

			{/* ============================================ */}
			{/* LIST                                         */}
			{/* ============================================ */}
			{/* ✅ List с готовыми items (уже отфильтрованы и отсортированы) */}
			<EntityList
				entity="notes"
				initialData={initialNotes}
				items={paginated}
				// reorder={reorder}
				className="grid gap-3"
				empty={
					filters.hasActiveFilters ? (
						<div className="text-center py-12">
							<p className="text-muted-foreground">
								Nothing matches your filters
							</p>
							<Button
								variant="link"
								onClick={filters.clearAll}
								className="mt-2"
							>
								Clear filters
							</Button>
						</div>
					) : (
						<p className="text-center text-muted-foreground py-12">
							No notes yet
						</p>
					)
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

			{/* ✅ Pagination — все элементы включены */}
			<EntityPagination {...pagination} maxVisiblePages={4} />

			{/* ✅ Вариант: без Rows per page и info */}
			{/* <EntityPagination {...pagination} showPerPage={false} showInfo={false} /> */}

			{/* ✅ Вариант: только стрелки */}
			{/* <EntityPagination {...pagination} showPageNumbers={false} showPerPage={false} showInfo={false} /> */}

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
