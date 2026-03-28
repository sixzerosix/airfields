/**
 * Storage Module
 *
 * npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * (нужно только если используешь S3-совместимые провайдеры)
 *
 * Структура:
 *   lib/storage/
 *     index.ts              ← этот файл
 *     types.ts              ← интерфейсы
 *     storage-service.ts    ← главный сервис
 *     supabase-adapter.ts   ← Supabase Storage
 *     s3-adapter.ts         ← S3-совместимые (MinIO, AWS, Beget, etc.)
 *
 * USAGE:
 *   import { getStorageService } from "@/lib/storage";
 *   const storage = getStorageService();
 *   await storage.upload(file, "user-id/photo.jpg");
 */

export { StorageService, getStorageService } from "./storage-service";
export { SupabaseStorageAdapter } from "./supabase-adapter";
export { S3StorageAdapter } from "./s3-adapter";
export type {
	StorageProvider,
	StorageAdapter,
	UploadOptions,
	UploadResult,
	SignedUrlResult,
} from "./types";
