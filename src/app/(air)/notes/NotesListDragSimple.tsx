"use client";

import Link from "next/link";
import { EntityField } from "@/components/entity/EntityField";
import { EntityEditor } from "@/components/entity/EntityEditor";
import { EntityListSortable } from "@/components/entity/EntityListSortable";
import { EntityPagination } from "@/components/entity/EntityPagination";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityPagination } from "@/hooks/useEntityPagination";
import { useEntityReorder } from "@/hooks/useEntityReorder";
import type { Note } from "@/lib/schemas";
import { CreateEntityInline } from "@/components/entity/CreateEntityInline";
import { CreateEntityDialog } from "@/components/entity/CreateEntityDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function NotesSimple({ initialNotes }: { initialNotes: Note[] }) {
	const rawItems = useEntityList("notes", initialNotes);

	const reorder = useEntityReorder("notes", rawItems, {
		enabled: true, // ← сразу включён
	});

	const sorted = reorder.sortByPosition(rawItems);

	const pagination = useEntityPagination({
		mode: "loadMore",
		defaultPerPage: 10,
	});

	const paginated = pagination.paginate(sorted);

	return (
		<div className="max-w-3xl mx-auto p-4 space-y-4">
			<h1 className="text-2xl font-bold">Notes</h1>
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
						<EntityField
							entity="notes"
							entityId={tempId}
							name="category_id"
						/>
						<EntityField
							entity="notes"
							entityId={tempId}
							name="tags"
						/>
					</>
				)}
			</CreateEntityDialog>

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

			<EntityListSortable
				entity="notes"
				initialData={initialNotes}
				items={paginated}
				reorder={reorder}
				className="grid gap-2"
			>
				{(note) => (
					<EntityEditor
						entity="notes"
						entityId={note.id}
						initialData={note}
					>
						<div className="flex items-center gap-3">
							<Link href={`/notes/${note.id}`} className="flex-1">
								<span className="font-medium">
									{note.title || "Untitled"}
								</span>
							</Link>
							{/* <EntityField
								entity="notes"
								entityId={note.id}
								name="status"
								customProps={{ label: "" }}
								className="min-w-[120px]"
							/> */}
						</div>
					</EntityEditor>
				)}
			</EntityListSortable>

			<EntityPagination {...pagination} />
		</div>
	);
}
