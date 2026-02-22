/**
 * SERVER COMPONENT - Task Page
 *
 * Загружает данные на сервере (SSR)
 *
 * Преимущества:
 * - SEO: данные в HTML
 * - Performance: нет fetch waterfall
 * - Меньше JS на клиенте
 */

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TaskEditor } from "@/components/tasks/TaskEditor";

// ============================================================================
// SERVER COMPONENT
// ============================================================================

interface PageProps {
	params: Promise<{
		id: string;
	}>;
}

/**
 * Task Page - Server Component
 *
 * Этот компонент выполняется ТОЛЬКО на сервере!
 * - Безопасный доступ к БД
 * - Данные в HTML (SEO)
 * - Быстрая загрузка
 */
export default async function TaskPage({ params }: PageProps) {
	// ========================================================================
	// ЗАГРУЗКА ДАННЫХ (на сервере)
	// ========================================================================
	// 2. Ждем разрешения Promise перед использованием
	const { id } = await params;

	const supabase = await createServerSupabaseClient();

	const { data: task, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("id", id)
		.single();

	// ========================================================================
	// ERROR HANDLING
	// ========================================================================

	if (error || !task) {
		console.error("[TaskPage] Task not found:", id, error);
		notFound(); // Next.js 404 page
	}

	// ========================================================================
	// RENDER CLIENT COMPONENT
	// ========================================================================

	// Передаём данные в Client Component
	// TaskEditor получает готовые данные!
	return <TaskEditor initialData={task} taskId={id} />;
}

// ============================================================================
// METADATA (для SEO)
// ============================================================================

/**
 * Generate metadata для каждой страницы
 * Next.js автоматически добавит в <head>
 */
export async function generateMetadata({ params }: PageProps) {
	const supabase = await createServerSupabaseClient();

	const { id } = await params;

	const { data: task } = await supabase
		.from("tasks")
		.select("title, description")
		.eq("id", id)
		.single();

	if (!task) {
		return {
			title: "Task Not Found",
		};
	}

	return {
		title: task.title || "Untitled Task",
		description: task.description?.slice(0, 160) || "Task details",
	};
}
