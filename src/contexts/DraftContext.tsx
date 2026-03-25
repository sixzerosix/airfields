import { createContext, useContext } from "react";

/**
 * DraftContext — сигнализирует EntityField что он внутри "создания"
 *
 * Когда DraftContext = true:
 * - EntityField автоматически переключается на saveMode="manual"
 * - НЕ вызывает updateEntityAction (записи ещё нет в БД)
 * - Пишет только в Store
 *
 * Пользователю НЕ НУЖНО помнить про customProps={{ saveMode: "manual" }}
 * Просто работает.
 */
export const DraftContext = createContext<boolean>(false);

/**
 * Хук для EntityField
 */
export function useIsDraft(): boolean {
	return useContext(DraftContext);
}
