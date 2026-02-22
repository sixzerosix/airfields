/**
 * SERVER COMPONENT - Tasks List Page
 *
 * Загружает список задач на сервере
 */

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// ============================================================================
// SERVER COMPONENT
// ============================================================================

/**
 * Tasks List Page - Server Component
 *
 * Загружает все задачи на сервере
 * - SEO friendly
 * - Быстрая загрузка
 * - Нет fetch waterfall
 */
export default async function TasksListPage() {
	// ========================================================================
	// ЗАГРУЗКА ДАННЫХ (на сервере)
	// ========================================================================

	const supabase = await createServerSupabaseClient();

	const { data: tasks, error } = await supabase
		.from("tasks")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("[TasksList] Error loading tasks:", error);
	}

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			{/* ======================================================== */}
			{/* HEADER                                                  */}
			{/* ======================================================== */}

			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Tasks</h1>

				<Button asChild>
					<Link href="/tasks/new">
						<Plus className="h-4 w-4 mr-2" />
						New Task
					</Link>
				</Button>
			</div>

			{/* ======================================================== */}
			{/* TASKS LIST                                              */}
			{/* ======================================================== */}

			{!tasks || tasks.length === 0 ? (
				<Card className="p-12">
					<div className="text-center text-muted-foreground">
						<p className="text-lg mb-4">No tasks yet</p>
						<Button asChild variant="outline">
							<Link href="/tasks/new">
								Create your first task
							</Link>
						</Button>
					</div>
				</Card>
			) : (
				<div className="space-y-4">
					{tasks.map((task) => (
						<Link
							key={task.id}
							href={`/tasks/${task.id}`}
							className="block"
						>
							<Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										<h2 className="text-xl font-semibold mb-2 truncate">
											{task.title || "Untitled Task"}
										</h2>

										{task.description && (
											<p className="text-muted-foreground line-clamp-2">
												{task.description}
											</p>
										)}

										<div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
											{task.status && (
												<span className="px-2 py-1 bg-muted rounded">
													{task.status}
												</span>
											)}

											{task.priority && (
												<span className="px-2 py-1 bg-muted rounded">
													{task.priority}
												</span>
											)}

											{task.due_date && (
												<span>
													Due:{" "}
													{new Date(
														task.due_date,
													).toLocaleDateString()}
												</span>
											)}
										</div>
									</div>

									<div className="text-xs text-muted-foreground">
										{new Date(
											task.updated_at,
										).toLocaleDateString()}
									</div>
								</div>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

// ============================================================================
// METADATA
// ============================================================================

export const metadata = {
	title: "Tasks",
	description: "Manage your tasks",
};
