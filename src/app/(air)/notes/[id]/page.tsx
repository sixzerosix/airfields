// ============================================================================
// app/notes/[id]/page.tsx
// ============================================================================

import { EntityPage } from "@/components/entity/EntityPage";
import { EntityEditor } from "@/components/entity/EntityEditor";
import { EntityField } from "@/components/entity/EntityField";
import { DeleteEntityButton } from "@/components/entity/DeleteEntityButton";
import { EditableFiles } from "@/components/fields/EditableFiles";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function PageNote({ params }: PageProps) {
	return (
		<EntityPage entity="notes" params={params}>
			{(note) => (
				<div className="max-w-5xl mx-auto p-6">
					{/* ✅ redirectOnDelete — при удалении из ДРУГОЙ вкладки → redirect */}
					<EntityEditor
						entity="notes"
						entityId={note.id}
						initialData={note}
						redirectOnDelete="/notes"
					>
						<div className="grid gap-4">
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

							{/* ✅ Категория — через EntityField, конфиг из registry */}
							<EntityField
								entity="notes"
								entityId={note.id}
								name="category_id"
							/>

							{/* ✅ Теги — через EntityField, конфиг из registry */}
							<EntityField
								entity="notes"
								entityId={note.id}
								name="tags"
							/>

							{/* <EntityField
								entity="notes"
								entityId={note.id}
								name="files"
							/> */}

							<EditableFiles
								entity="notes"
								entityId={note.id}
								field="files"
								label="Файлы"
								variant="compact"
								maxFiles={5}
							/>

							{/* <EditableFiles
								entity="notes"
								entityId={note.id}
								field="files"
								label="Documents"
								variant="list"
								accept={["application/pdf", ".doc", ".docx"]}
							/>

							<EditableFiles
								entity="notes"
								entityId={note.id}
								field="files"
								label="Файлы"
								variant="compact"
								maxFiles={5}
							/>

							<div className="toolbar">
								<EditableFiles
									entity="notes"
									entityId={note.id}
									field="files"
									variant="trigger"
									trigger={
										<Button size="sm">
											<Paperclip /> Attach
										</Button>
									}
								/>
							</div>

							<div className="content">
								
								<EditableFiles
									entity="notes"
									entityId={note.id}
									field="files"
									variant="card"
								/>
							</div> */}

							{/* ✅ Delete из ЭТОЙ вкладки — свой redirect */}
							<DeleteEntityButton
								entity="notes"
								entityId={note.id}
								redirectTo="/notes"
								confirmTitle="Удалить заметку?"
								confirmDescription="Это действие нельзя отменить."
								confirmText="Удалить"
								cancelText="Отмена"
							/>
						</div>
					</EntityEditor>
				</div>
			)}
		</EntityPage>
	);
}

// ============================================================================
// Что происходит при удалении:
// ============================================================================
//
// Сценарий: заметка открыта в 3 вкладках. Удаляешь из Вкладки 1.
//
// Вкладка 1 (нажал Delete):
//   DeleteEntityButton → useEntityDelete.remove()
//   → store.deleteEntity("notes", id)     (optimistic)
//   → deleteEntityAction()                (server)
//   → router.push("/notes")               (redirectTo)
//
// Supabase:
//   → broadcast DELETE через Realtime channel
//
// Вкладка 2 (заметка открыта):
//   realtime.ts → получил DELETE event
//   → handleDelete() → store.deleteEntity("notes", id)
//   → EntityEditor: data стало null, initialized.current = true
//   → useEffect: "данные были и пропали"
//   → toast.info("This record was deleted")
//   → router.push("/notes")               (redirectOnDelete)
//
// Вкладка 3 (заметка открыта):
//   Та же цепочка → тоже redirect на /notes
//
// Вкладка 4 (список заметок):
//   realtime.ts → получил DELETE event
//   → store.deleteEntity("notes", id)
//   → EntityList ре-рендерится без удалённой заметки
//   → Пользователь видит что заметка исчезла из списка
