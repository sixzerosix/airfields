"use client";

/**
 * NEW TASK PAGE - Client Component
 *
 * Форма создания новой задачи
 * Использует Server Action для создания
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEntityAction } from "@/actions/update-entity";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export default function NewTaskPage() {
	const router = useRouter();
	const [isCreating, setIsCreating] = useState(false);

	// ========================================================================
	// FORM STATE
	// ========================================================================

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		status: "todo",
		priority: "medium",
	});

	// ========================================================================
	// HANDLERS
	// ========================================================================

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.title.trim()) {
			toast.error("Title is required");
			return;
		}

		setIsCreating(true);

		try {
			// ====================================================================
			// SERVER ACTION - создать задачу
			// ====================================================================

			const result = await createEntityAction({
				entity: "tasks",
				data: {
					title: formData.title,
					description: formData.description || null,
					status: formData.status,
					priority: formData.priority,
				},
			});

			if (result?.serverError || result?.validationErrors) {
				toast.error("Failed to create task", {
					description: result.serverError || "Validation failed",
				});
				return;
			}

			if (result?.data) {
				toast.success("Task created!");
				router.push(`/tasks/${result.data.id}`);
			}
		} catch (error) {
			console.error("[NewTask] Error:", error);
			toast.error("Failed to create task");
		} finally {
			setIsCreating(false);
		}
	};

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div className="max-w-2xl mx-auto p-6">
			<Card className="p-8">
				<h1 className="text-2xl font-bold mb-6">Create New Task</h1>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* TITLE */}
					<div className="space-y-2">
						<Label htmlFor="title">Title *</Label>
						<Input
							id="title"
							value={formData.title}
							onChange={(e) =>
								setFormData({
									...formData,
									title: e.target.value,
								})
							}
							placeholder="Enter task title..."
							required
							autoFocus
						/>
					</div>

					{/* DESCRIPTION */}
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) =>
								setFormData({
									...formData,
									description: e.target.value,
								})
							}
							placeholder="Add a description..."
							rows={6}
						/>
					</div>

					{/* STATUS & PRIORITY */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="status">Status</Label>
							<select
								id="status"
								value={formData.status}
								onChange={(e) =>
									setFormData({
										...formData,
										status: e.target.value,
									})
								}
								className="w-full px-3 py-2 border rounded-md"
							>
								<option value="todo">To Do</option>
								<option value="in_progress">In Progress</option>
								<option value="done">Done</option>
							</select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="priority">Priority</Label>
							<select
								id="priority"
								value={formData.priority}
								onChange={(e) =>
									setFormData({
										...formData,
										priority: e.target.value,
									})
								}
								className="w-full px-3 py-2 border rounded-md"
							>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="urgent">Urgent</option>
							</select>
						</div>
					</div>

					{/* BUTTONS */}
					<div className="flex gap-3">
						<Button
							type="submit"
							disabled={isCreating}
							className="flex-1"
						>
							{isCreating ? "Creating..." : "Create Task"}
						</Button>

						<Button
							type="button"
							variant="outline"
							onClick={() => router.back()}
							disabled={isCreating}
						>
							Cancel
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}
