/**
 * Supabase Storage Adapter
 *
 * Использует встроенный Supabase Storage API.
 * Не нужны дополнительные зависимости.
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
	StorageAdapter,
	StorageProvider,
	UploadOptions,
	UploadResult,
	SignedUrlResult,
} from "./types";

export class SupabaseStorageAdapter implements StorageAdapter {
	private bucket: string;

	constructor(provider: StorageProvider) {
		this.bucket = provider.bucket;
	}

	async upload(file: File | Blob, options: UploadOptions): Promise<UploadResult> {
		const supabase = getSupabaseClient();

		const { data, error } = await supabase.storage
			.from(this.bucket)
			.upload(options.path, file, {
				contentType: options.contentType,
				upsert: options.upsert ?? false,
			});

		if (error) throw new Error(`Supabase upload failed: ${error.message}`);

		return {
			path: data.path,
		};
	}

	async delete(paths: string[]): Promise<void> {
		const supabase = getSupabaseClient();

		const { error } = await supabase.storage
			.from(this.bucket)
			.remove(paths);

		if (error) throw new Error(`Supabase delete failed: ${error.message}`);
	}

	async getSignedUrl(path: string, expiresInSeconds: number): Promise<SignedUrlResult> {
		const supabase = getSupabaseClient();

		const { data, error } = await supabase.storage
			.from(this.bucket)
			.createSignedUrl(path, expiresInSeconds);

		if (error) throw new Error(`Supabase signed URL failed: ${error.message}`);

		return {
			url: data.signedUrl,
			expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
		};
	}

	getPublicUrl(path: string): string | null {
		const supabase = getSupabaseClient();

		const { data } = supabase.storage
			.from(this.bucket)
			.getPublicUrl(path);

		return data.publicUrl || null;
	}
}
