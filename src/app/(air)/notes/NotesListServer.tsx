"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from "lucide-react";
import { EntityList } from "@/components/entity/EntityList";
import { EntityField } from "@/components/entity/EntityField";
import { EntityEditor } from "@/components/entity/EntityEditor";
import { CreateEntityDialog } from "@/components/entity/CreateEntityDialog";
import type { Note } from "@/lib/schemas";
import { EditEntityDialog } from "@/components/entity/EditEntityDialog";
import { useState } from "react";
import { DeleteEntityButton } from "@/components/entity/DeleteEntityButton";
import { CreateEntityInline } from "@/components/entity/CreateEntityInline";
import { useServerEntityList } from "@/hooks/useServerEntityList";
import { ServerEntityToolbar } from "@/components/entity/ServerEntityToolbar";
import { EntityPagination } from "@/components/entity/EntityPagination";
import { STATUS_NOTE_OPTIONS } from "@/lib/registry";

// ============================================================================
// CREATE DIALOG (вынесен отдельно)
// ============================================================================

function CreateNoteDialog() {
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
					<EntityField entity="notes" entityId={tempId} name="tags" />
				</>
			)}
		</CreateEntityDialog>
	);
}

// ============================================================================
// NOTES LIST (серверная пагинация)
// ============================================================================

export function NotesListServer({ initialNotes }: { initialNotes: Note[] }) {
	const [editingId, setEditingId] = useState<string | null>(null);

	// ✅ Серверная пагинация — фильтры/сортировка/пагинация на Supabase
	const serverList = useServerEntityList("notes", {
		defaultSort: { field: "created_at", direction: "desc" },
		defaultPerPage: 25,
		perPageOptions: [10, 25, 50, 100],
		filterFields: [
			{ field: "title", type: "text" },
			{ field: "description", type: "text" },
			{ field: "status", type: "select" },
			{ field: "created_at", type: "date" },
		],
		priorityFields: ["is_favorite"],
		selectFields:
			"id, title, description, status, is_favorite, category_id, position, created_at, updated_at",
		countMethod: "exact",
		syncUrl: true,
		enableRealtime: true,
		initialData: initialNotes,
		initialTotal: initialNotes.length,
	});

	return (
		<div className="max-w-5xl mx-auto p-4 grid gap-3">
			{/* ============================================ */}
			{/* HEADER + CREATE                              */}
			{/* ============================================ */}
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Notes</h1>
				<CreateNoteDialog />
			</div>

			<div>
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

			{/* ============================================ */}
			{/* TOOLBAR (серверные фильтры)                  */}
			{/* ============================================ */}
			<ServerEntityToolbar
				filters={serverList.filters}
				sort={serverList.sort}
				search={serverList.search}
				setFilter={serverList.setFilter}
				setSort={serverList.setSort}
				setSearch={serverList.setSearch}
				clearFilters={serverList.clearFilters}
				isRefetching={serverList.isRefetching}
				searchPlaceholder="Search notes..."
				sortFields={[
					{ field: "created_at", label: "Date Created" },
					{ field: "updated_at", label: "Last Updated" },
					{ field: "title", label: "Title" },
					{ field: "status", label: "Status" },
				]}
				filterConfigs={[
					{
						field: "status",
						label: "Status",
						type: "select",
						options: STATUS_NOTE_OPTIONS,
					},
					{
						field: "is_favorite",
						label: "Favorite",
						type: "boolean",
					},
				]}
			/>

			{/* ============================================ */}
			{/* LIST                                         */}
			{/* ============================================ */}
			<EntityList
				entity="notes"
				initialData={initialNotes}
				items={serverList.items}
				className="grid gap-3"
				empty={
					serverList.hasActiveFilters ? (
						<div className="text-center py-12">
							<p className="text-muted-foreground">
								Nothing matches your filters
							</p>
							<Button
								variant="link"
								onClick={serverList.clearFilters}
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

							<EntityField
								entity="notes"
								entityId={note.id}
								name="is_favorite"
								customProps={{ label: "" }}
							/>

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

			{/* ============================================ */}
			{/* PAGINATION (серверная)                       */}
			{/* ============================================ */}
			<EntityPagination
				mode="pages"
				page={serverList.page}
				perPage={serverList.perPage}
				totalItems={serverList.totalItems}
				totalPages={serverList.totalPages}
				hasNextPage={serverList.hasNextPage}
				hasPrevPage={serverList.hasPrevPage}
				setPage={serverList.setPage}
				setPerPage={serverList.setPerPage}
				nextPage={serverList.nextPage}
				prevPage={serverList.prevPage}
				perPageOptions={serverList.perPageOptions}
				maxVisiblePages={4}
				startIndex={(serverList.page - 1) * serverList.perPage}
				endIndex={Math.min(
					serverList.page * serverList.perPage,
					serverList.totalItems,
				)}
				goToFirst={() => serverList.setPage(1)}
				goToLast={() => serverList.setPage(serverList.totalPages)}
				loadMore={() => {}}
				paginate={(items) => items}
				sentinelRef={() => {}}
			/>

			{/* ============================================ */}
			{/* EDIT DIALOG                                  */}
			{/* ============================================ */}
			<EditEntityDialog
				entity="notes"
				entityId={editingId}
				onClose={() => setEditingId(null)}
				title="Edit Note"
				footer={(id) => (
					<div className="flex justify-between w-full">
						<DeleteEntityButton
							entity="notes"
							entityId={id}
							variant="outline"
							size="sm"
							confirmTitle="Delete this note?"
							confirmDescription="This action cannot be undone."
							onSuccess={() => setEditingId(null)}
						/>
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
						<EntityField
							entity="notes"
							entityId={id}
							name="category_id"
						/>
						<EntityField entity="notes" entityId={id} name="tags" />
					</>
				)}
			</EditEntityDialog>
		</div>
	);
}
