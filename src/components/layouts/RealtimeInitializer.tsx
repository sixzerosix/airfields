// components/RealtimeInitializer.tsx
"use client";

import { useEffect } from "react";
import {
	initializeRealtime,
	cleanupRealtime,
} from "@/lib/supabase/realtime-manager";

export function RealtimeInitializer() {
	useEffect(() => {
		initializeRealtime();

		// Очистка при размонтировании приложения (например, при logout или закрытии вкладки)
		return () => {
			cleanupRealtime();
		};
	}, []);

	// Этот компонент ничего не рендерит
	return null;
}
