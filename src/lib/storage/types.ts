/**
 * Storage Abstraction Layer — Types
 *
 * Единый интерфейс для всех S3-совместимых хранилищ.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface StorageProvider {
	id: string;
	name: string;
	type: "supabase" | "s3";
	endpoint: string | null;
	region: string;
	bucket: string;
	access_key: string | null;
	secret_key: string | null;
	is_default: boolean;
	is_public: boolean;
	base_url: string | null;
}

export interface UploadOptions {
	/** Путь внутри bucket (без bucket name) */
	path: string;
	/** MIME type */
	contentType?: string;
	/** Перезаписать если существует? @default false */
	upsert?: boolean;
}

export interface UploadResult {
	/** Полный путь в storage */
	path: string;
	/** Публичный URL (если bucket публичный) */
	publicUrl?: string;
}

export interface SignedUrlResult {
	url: string;
	expiresAt: Date;
}

/**
 * Интерфейс адаптера хранилища.
 * Реализуется для каждого типа провайдера.
 */
export interface StorageAdapter {
	upload(file: File | Blob, options: UploadOptions): Promise<UploadResult>;
	delete(paths: string[]): Promise<void>;
	getSignedUrl(path: string, expiresInSeconds: number): Promise<SignedUrlResult>;
	getPublicUrl(path: string): string | null;
}
