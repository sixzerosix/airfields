"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setError(error.message);
			setLoading(false);
			return;
		}

		// Успешный логин → редирект на заметки
		router.push("/notes");
		router.refresh(); // чтобы серверные компоненты подхватили новую сессию
	};

	return (
		<div className="max-w-md mx-auto mt-20 p-6 border rounded-xl">
			<h1 className="text-2xl font-bold mb-6">Вход</h1>

			<form onSubmit={handleLogin} className="space-y-4">
				<div>
					<label
						htmlFor="email"
						className="block text-sm font-medium mb-1"
					>
						Email
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full p-2 border rounded"
						required
					/>
				</div>

				<div>
					<label
						htmlFor="password"
						className="block text-sm font-medium mb-1"
					>
						Пароль
					</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full p-2 border rounded"
						required
					/>
				</div>

				{error && <p className="text-red-600 text-sm">{error}</p>}

				<button
					type="submit"
					disabled={loading}
					className="w-full bg-primary text-white py-2 rounded disabled:opacity-50"
				>
					{loading ? "Вход..." : "Войти"}
				</button>
			</form>
		</div>
	);
}
