"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client"; // твой клиент
import { Button } from "@/components/ui/button";

export function LogOutButton() {
	const router = useRouter();

	const handleSignOut = async () => {
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Ошибка выхода:", error.message);
			alert("Не удалось выйти. Попробуйте снова.");
			return;
		}

		// Успешный выход → обновляем серверные компоненты и редиректим
		router.refresh(); // важно! заставляет Next.js перезагрузить серверные данные
		router.push("/login"); // или '/' — куда хочешь после выхода
	};

	return (
		<Button size={"sm"} variant={"outline"} onClick={handleSignOut}>
			Выйти
		</Button>
	);
}
