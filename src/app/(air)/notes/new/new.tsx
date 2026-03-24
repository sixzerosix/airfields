"use client";
import { CreateEntityPage } from "@/components/entity/CreateEntityPage";
import { EntityField } from "@/components/entity/EntityField";

export async function NewNote() {
	return (
		<CreateEntityPage
			entity="notes"
			redirectTo="/notes"
			initialValues={{ status: "todo" }}
			className="max-w-5xl mx-auto p-6"
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
		</CreateEntityPage>
	);
}
