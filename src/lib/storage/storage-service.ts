/**
 * StorageService — главный сервис хранилища
 *
 * Роутит операции на нужный адаптер (Supabase / S3).
 * Кеширует адаптеры и провайдеры.
 *
 * USAGE:
 * ```ts
 * const storage = StorageService.getInstance();
 *
 * // Upload с дефолтным провайдером
 * const result = await storage.upload(file, "user-id/photo.jpg");
 *
 * // Upload с конкретным провайдером
 * const result = await storage.upload(file, "path/file.pdf", { providerId: "uuid" });
 *
 * // Signed URL
 * const { url } = await storage.getSignedUrl("path/file.pdf");
 *
 * // Delete
 * await storage.delete(["path/file.pdf"]);
 * ```
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import { SupabaseStorageAdapter } from "./supabase-adapter";
import { S3StorageAdapter } from "./s3-adapter";
import type {
	StorageAdapter,
	StorageProvider,
	UploadResult,
	SignedUrlResult,
} from "./types";

// ============================================================================
// SERVICE
// ============================================================================

export class StorageService {
	private static instance: StorageService;

	/** Кеш адаптеров (provider_id → adapter) */
	private adapters = new Map<string, StorageAdapter>();

	/** Кеш провайдеров (provider_id → config) */
	private providers = new Map<string, StorageProvider>();

	/** Дефолтный provider_id */
	private defaultProviderId: string | null = null;

	private initialized = false;

	// ==========================================================================
	// SINGLETON
	// ==========================================================================

	static getInstance(): StorageService {
		if (!StorageService.instance) {
			StorageService.instance = new StorageService();
		}
		return StorageService.instance;
	}

	// ==========================================================================
	// INIT — загрузить провайдеры из БД
	// ==========================================================================

	async init(): Promise<void> {
		if (this.initialized) return;

		const supabase = getSupabaseClient();

		const { data, error } = await supabase
			.from("storage_providers")
			.select("*")
			.order("is_default", { ascending: false });

		if (error) {
			console.error("[StorageService] Failed to load providers:", error);
			return;
		}

		for (const provider of data || []) {
			this.providers.set(provider.id, provider);

			if (provider.is_default && !this.defaultProviderId) {
				this.defaultProviderId = provider.id;
			}
		}

		this.initialized = true;
	}

	// ==========================================================================
	// GET ADAPTER
	// ==========================================================================

	private async getAdapter(providerId?: string): Promise<{
		adapter: StorageAdapter;
		provider: StorageProvider;
	}> {
		await this.init();

		const id = providerId || this.defaultProviderId;
		if (!id) throw new Error("No storage provider configured");

		const provider = this.providers.get(id);
		if (!provider) throw new Error(`Storage provider "${id}" not found`);

		// Кешированный адаптер
		let adapter = this.adapters.get(id);
		if (!adapter) {
			adapter = this.createAdapter(provider);
			this.adapters.set(id, adapter);
		}

		return { adapter, provider };
	}

	private createAdapter(provider: StorageProvider): StorageAdapter {
		switch (provider.type) {
			case "supabase":
				return new SupabaseStorageAdapter(provider);
			case "s3":
				return new S3StorageAdapter(provider);
			default:
				throw new Error(`Unknown storage type: ${provider.type}`);
		}
	}

	// ==========================================================================
	// PUBLIC API
	// ==========================================================================

	/**
	 * Загрузить файл
	 */
	async upload(
		file: File | Blob,
		path: string,
		options?: {
			providerId?: string;
			contentType?: string;
			upsert?: boolean;
		},
	): Promise<UploadResult & { providerId: string }> {
		const { adapter, provider } = await this.getAdapter(options?.providerId);

		const result = await adapter.upload(file, {
			path,
			contentType: options?.contentType || (file instanceof File ? file.type : undefined),
			upsert: options?.upsert,
		});

		return {
			...result,
			providerId: provider.id,
		};
	}

	/**
	 * Удалить файлы
	 */
	async delete(
		paths: string[],
		providerId?: string,
	): Promise<void> {
		const { adapter } = await this.getAdapter(providerId);
		await adapter.delete(paths);
	}

	/**
	 * Получить signed URL для просмотра/скачивания
	 */
	async getSignedUrl(
		path: string,
		expiresInSeconds = 3600,
		providerId?: string,
	): Promise<SignedUrlResult> {
		const { adapter } = await this.getAdapter(providerId);
		return adapter.getSignedUrl(path, expiresInSeconds);
	}

	/**
	 * Получить публичный URL (если bucket публичный)
	 */
	getPublicUrl(path: string, providerId?: string): string | null {
		const id = providerId || this.defaultProviderId;
		if (!id) return null;

		const adapter = this.adapters.get(id);
		if (!adapter) return null;

		return adapter.getPublicUrl(path);
	}

	// ==========================================================================
	// HELPERS
	// ==========================================================================

	/**
	 * Список доступных провайдеров
	 */
	async getProviders(): Promise<StorageProvider[]> {
		await this.init();
		return Array.from(this.providers.values());
	}

	/**
	 * Дефолтный провайдер
	 */
	async getDefaultProvider(): Promise<StorageProvider | null> {
		await this.init();
		if (!this.defaultProviderId) return null;
		return this.providers.get(this.defaultProviderId) || null;
	}

	/**
	 * Сбросить кеш (при добавлении/удалении провайдера)
	 */
	reset(): void {
		this.adapters.clear();
		this.providers.clear();
		this.defaultProviderId = null;
		this.initialized = false;
	}
}

// ============================================================================
// SHORTCUT
// ============================================================================

/** Быстрый доступ к сервису */
export function getStorageService(): StorageService {
	return StorageService.getInstance();
}
