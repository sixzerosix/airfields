"use client";

/**
 * CLIENT COMPONENT - Task Editor
 *
 * UI и интерактивность (выполняется на клиенте)
 *
 * Получает данные от Server Component
 * Управляет:
 * - Real-time подписками
 * - Локальным состоянием
 * - UI обновлениями
 */

import { useEffect, useRef } from "react";
import { useStore, selectEntity } from "@/lib/store";
import { subscribeToEntity } from "@/lib/supabase/realtime";
import { EntityField } from "@/components/EntityField";
import { Card } from "@/components/ui/card";
import { ManyToManyTags } from "@/components/fields/ManyToManyTags";

import type { Task } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

interface TaskEditorProps {
	initialData: Task;
	taskId: string;
}

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

/**
 * TaskEditor - Client Component
 *
 * Этот компонент выполняется на КЛИЕНТЕ!
 * - Real-time подписки
 * - Интерактивность
 * - State management
 */
export function TaskEditor({ initialData, taskId }: TaskEditorProps) {
	// ========================================================================
	// ИНИЦИАЛИЗАЦИЯ STORE
	// ========================================================================

	const initialized = useRef(false);

	if (!initialized.current) {
		// Поместить данные из сервера в store
		useStore.getState().upsertEntity("tasks", taskId, initialData);
		initialized.current = true;
	}

	// ========================================================================
	// STORE SUBSCRIPTION
	// ========================================================================

	// Подписка на обновления из store
	const task = useStore((state) => selectEntity(state, "tasks", taskId));

	// ========================================================================
	// REAL-TIME SUBSCRIPTION
	// ========================================================================

	useEffect(() => {
		console.log("[TaskEditor] Setting up real-time subscription");

		const unsubscribe = subscribeToEntity("tasks");

		return () => {
			console.log("[TaskEditor] Cleaning up real-time subscription");
			unsubscribe();
		};
	}, []);

	// ========================================================================
	// FALLBACK
	// ========================================================================

	if (!task) {
		return (
			<div className="max-w-2xl mx-auto p-6">
				<Card className="p-8">
					<p className="text-center text-muted-foreground">
						Loading...
					</p>
				</Card>
			</div>
		);
	}

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div className="max-w-2xl mx-auto p-6 space-y-8">
			<Card className="p-8">
				<h1 className="text-2xl font-bold mb-6">Task Details</h1>

				<div className="space-y-6">
					{/* ====================================================== */}
					{/* CONSTRUCTOR MODE - Автоматический рендер из registry  */}
					{/* ====================================================== */}

					<EntityField
						entity="tasks"
						entityId={taskId}
						name="title"
						value={task.title}
					/>

					<EntityField
						entity="tasks"
						entityId={taskId}
						name="description"
						value={task.description}
					/>

					<div className="grid grid-cols-2 gap-4">
						<EntityField
							entity="tasks"
							entityId={taskId}
							name="priority"
							value={task.priority}
						/>

						<EntityField
							entity="tasks"
							entityId={taskId}
							name="due_date"
							value={task.due_date}
						/>
					</div>

					<EntityField
						entity="tasks"
						entityId={taskId}
						name="status"
						value={task.status}
					/>

					{/* NEW: Project Reference Picker */}
					<EntityField
						entity="tasks"
						entityId={taskId}
						name="project_id"
						value={task.project_id}
					/>

					{/* NEW: Tags (Many-to-Many через junction table) */}
					<ManyToManyTags
						entityType="tasks"
						entityId={taskId}
						label="Tags"
						placeholder="Add tags..."
						maxSelections={10}
					/>
				</div>
			</Card>

			{/* ======================================================== */}
			{/* METADATA                                                */}
			{/* ======================================================== */}

			<Card className="p-6 bg-muted">
				<h3 className="text-sm font-semibold mb-2">Metadata</h3>
				<div className="text-xs text-muted-foreground space-y-1">
					<p>ID: {task.id}</p>
					<p>Created: {new Date(task.created_at).toLocaleString()}</p>
					<p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
				</div>
			</Card>
		</div>
	);
}
