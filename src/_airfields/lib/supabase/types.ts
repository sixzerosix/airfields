/**
 * Типы для Supabase Database
 * Генерируются командой: npx supabase gen types typescript --local
 * Здесь упрощённая версия для примера
 */

export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export interface Database {
	public: {
		Tables: {
			tasks: {
				Row: {
					id: string
					title: string
					description: string | null
					status: string
					priority: string | null
					due_date: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					title: string
					description?: string | null
					status?: string
					priority?: string | null
					due_date?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					title?: string
					description?: string | null
					status?: string
					priority?: string | null
					due_date?: string | null
					created_at?: string
					updated_at?: string
				}
			}
			projects: {
				Row: {
					id: string
					name: string
					description: string | null
					status: string
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					name: string
					description?: string | null
					status?: string
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					name?: string
					description?: string | null
					status?: string
					created_at?: string
					updated_at?: string
				}
			}
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			[_ in never]: never
		}
		Enums: {
			[_ in never]: never
		}
	}
}