/**
 * S3-Compatible Storage Adapter
 *
 * Работает с любым S3-совместимым хранилищем:
 * - Amazon S3
 * - MinIO (self-hosted)
 * - Beget S3
 * - DigitalOcean Spaces
 * - Cloudflare R2
 * - Backblaze B2
 * - и др.
 *
 * npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */

import {
	S3Client,
	PutObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
	StorageAdapter,
	StorageProvider,
	UploadOptions,
	UploadResult,
	SignedUrlResult,
} from "./types";

export class S3StorageAdapter implements StorageAdapter {
	private client: S3Client;
	private bucket: string;
	private provider: StorageProvider;

	constructor(provider: StorageProvider) {
		this.provider = provider;
		this.bucket = provider.bucket;

		this.client = new S3Client({
			region: provider.region || "us-east-1",
			endpoint: provider.endpoint || undefined,
			credentials:
				provider.access_key && provider.secret_key
					? {
							accessKeyId: provider.access_key,
							secretAccessKey: provider.secret_key,
						}
					: undefined,
			// MinIO и другие self-hosted требуют forcePathStyle
			forcePathStyle: !!provider.endpoint,
		});
	}

	async upload(file: File | Blob, options: UploadOptions): Promise<UploadResult> {
		// Конвертируем File/Blob в ArrayBuffer для S3
		const buffer = await file.arrayBuffer();

		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: options.path,
			Body: new Uint8Array(buffer),
			ContentType: options.contentType || "application/octet-stream",
		});

		try {
			await this.client.send(command);
		} catch (err: any) {
			throw new Error(`S3 upload failed: ${err.message}`);
		}

		const publicUrl = this.getPublicUrl(options.path);

		return {
			path: options.path,
			publicUrl: publicUrl || undefined,
		};
	}

	async delete(paths: string[]): Promise<void> {
		if (paths.length === 0) return;

		const command = new DeleteObjectsCommand({
			Bucket: this.bucket,
			Delete: {
				Objects: paths.map((key) => ({ Key: key })),
			},
		});

		try {
			await this.client.send(command);
		} catch (err: any) {
			throw new Error(`S3 delete failed: ${err.message}`);
		}
	}

	async getSignedUrl(
		path: string,
		expiresInSeconds: number,
	): Promise<SignedUrlResult> {
		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: path,
		});

		try {
			const url = await getS3SignedUrl(this.client, command, {
				expiresIn: expiresInSeconds,
			});

			return {
				url,
				expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
			};
		} catch (err: any) {
			throw new Error(`S3 signed URL failed: ${err.message}`);
		}
	}

	getPublicUrl(path: string): string | null {
		if (!this.provider.is_public) return null;

		// Custom domain / CDN
		if (this.provider.base_url) {
			return `${this.provider.base_url.replace(/\/$/, "")}/${path}`;
		}

		// Standard S3 URL
		if (this.provider.endpoint) {
			return `${this.provider.endpoint}/${this.bucket}/${path}`;
		}

		// AWS S3
		return `https://${this.bucket}.s3.${this.provider.region}.amazonaws.com/${path}`;
	}
}
