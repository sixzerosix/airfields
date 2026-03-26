// ============================================================================
// Скрипт миграции: генерация правильных fractional keys
// ============================================================================
//
// Запусти ОДИН РАЗ:
//   npx tsx scripts/migrate-positions.ts
//
// Или добавь в package.json:
//   "migrate:positions": "tsx scripts/migrate-positions.ts"
//
// Или просто вставь логику в временный API route и вызови один раз.
// ============================================================================

import { generateNKeysBetween } from "fractional-indexing";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role!

async function migrate() {
	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

	// Получить все записи, сгруппированные по user_id
	const { data: notes, error } = await supabase
		.from("notes")
		.select("id, user_id, created_at")
		.order("created_at", { ascending: true });

	if (error) {
		console.error("Failed to fetch notes:", error);
		return;
	}

	if (!notes || notes.length === 0) {
		console.log("No notes to migrate");
		return;
	}

	// Группируем по user_id
	const byUser = new Map<string, typeof notes>();
	for (const note of notes) {
		const userId = note.user_id;
		if (!byUser.has(userId)) byUser.set(userId, []);
		byUser.get(userId)!.push(note);
	}

	let totalUpdated = 0;

	for (const [userId, userNotes] of byUser) {
		// Генерируем N ключей — правильных, от библиотеки
		const keys = generateNKeysBetween(null, null, userNotes.length);

		console.log(`User ${userId}: ${userNotes.length} notes, keys: ${keys[0]} ... ${keys[keys.length - 1]}`);

		// Обновляем каждую запись
		for (let i = 0; i < userNotes.length; i++) {
			const { error: updateError } = await supabase
				.from("notes")
				.update({ position: keys[i] })
				.eq("id", userNotes[i].id);

			if (updateError) {
				console.error(`Failed to update ${userNotes[i].id}:`, updateError);
			} else {
				totalUpdated++;
			}
		}
	}

	console.log(`\nDone! Updated ${totalUpdated} notes.`);
}

migrate().catch(console.error);