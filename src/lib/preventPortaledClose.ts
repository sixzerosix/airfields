/**
 * preventDialogCloseOnPortaledContent
 *
 * Dialog (Radix) перехватывает клики вне себя и закрывается.
 * Combobox/Select/Popover рендерят dropdown в Portal (вне Dialog DOM).
 * Результат: клик на dropdown → Dialog считает это "outside" → закрывается.
 *
 * Этот handler проверяет — если клик был на portaled UI контент,
 * а НЕ на overlay — блокирует закрытие.
 *
 * Использование:
 * <DialogContent
 *   onPointerDownOutside={preventPortaledClose}
 *   onInteractOutside={preventPortaledClose}
 * >
 */

export function preventPortaledClose(e: Event) {
	const target = e.target as HTMLElement | null;
	if (!target) return;

	// Если клик на сам overlay (затемнение) — разрешить закрытие
	if (
		target.dataset?.slot === "dialog-overlay" ||
		target.getAttribute("data-state") === "open" &&
		target.getAttribute("role") === "presentation"
	) {
		return; // Разрешить закрытие
	}

	// Всё остальное "вне Dialog" — это portaled контент (Combobox, Select, etc.)
	// Блокируем закрытие
	e.preventDefault();
}