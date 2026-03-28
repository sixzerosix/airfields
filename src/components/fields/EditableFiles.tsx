"use client";

/**
 * EditableFiles v2 — M2M файловый аплоадер
 *
 * Режимы (variant):
 *   "card"     — сетка карточек с превью
 *   "list"     — горизонтальные строки
 *   "compact"  — кнопка "+" → файлы рядом, без dropzone
 *   "trigger"  — только trigger кнопка, файлы рендерятся отдельно через renderFiles()
 *
 * ✅ Instant placeholders — файл появляется сразу со skeleton
 * ✅ Per-file loading indicator
 * ✅ Storage path: user_id/entity_type/file_id.ext
 * ✅ StorageService (multi-provider)
 * ✅ Draft mode / Realtime
 */

import {
	useState,
	useEffect,
	useCallback,
	useRef,
	type ReactNode,
} from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	Upload,
	X,
	Plus,
	File as FileIcon,
	Image as ImageIcon,
	FileText,
	FileSpreadsheet,
	FileArchive,
	FileVideo,
	FileAudio,
	Loader2,
	Paperclip,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getStorageService } from "@/lib/storage";
import { useStore } from "@/lib/store";
import { useIsDraft } from "@/contexts/DraftContext";
import type { EntityType } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface FileRecord {
	id: string;
	original_name: string;
	mime_type: string;
	size: number;
	storage_path: string;
	provider_id: string | null;
	description: string | null;
	url?: string;
	/** Файл ещё грузится (placeholder) */
	_uploading?: boolean;
	/** Локальный ObjectURL для мгновенного превью */
	_localUrl?: string;
}

interface EditableFilesProps<E extends EntityType> {
	entity: E;
	entityId: string;
	field: string;
	value?: string[];
	label?: string;
	className?: string;
	disabled?: boolean;

	/** MIME типы @default все */
	accept?: string[];

	/** Макс MB @default 10 */
	maxSizeMB?: number;

	/** Макс файлов @default 10 */
	maxFiles?: number;

	/**
	 * Режим отображения:
	 * - "card"    — сетка карточек
	 * - "list"    — строки
	 * - "compact" — кнопка "+" → карточки рядом, без dropzone
	 * - "trigger" — только кнопка, файлы через renderFiles()
	 * @default "card"
	 */
	variant?: "card" | "list" | "compact" | "trigger";

	/** Кастомный trigger (для variant="trigger" или "compact") */
	trigger?: ReactNode;

	/** Показывать размер @default true */
	showSize?: boolean;

	/** Realtime @default true */
	enableRealtime?: boolean;

	/** Storage provider ID */
	storageProvider?: string;

	onSuccess?: () => void;
	onError?: (error: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string, size = "h-4 w-4") {
	const cls = size;
	if (mimeType.startsWith("image/")) return <ImageIcon className={cls} />;
	if (mimeType.startsWith("video/")) return <FileVideo className={cls} />;
	if (mimeType.startsWith("audio/")) return <FileAudio className={cls} />;
	if (mimeType.includes("pdf"))
		return <FileText className={cn(cls, "text-red-500")} />;
	if (
		mimeType.includes("spreadsheet") ||
		mimeType.includes("excel") ||
		mimeType.includes("csv")
	)
		return <FileSpreadsheet className={cn(cls, "text-green-500")} />;
	if (
		mimeType.includes("zip") ||
		mimeType.includes("rar") ||
		mimeType.includes("tar") ||
		mimeType.includes("gz")
	)
		return <FileArchive className={cn(cls, "text-yellow-500")} />;
	if (mimeType.includes("word") || mimeType.includes("document"))
		return <FileText className={cn(cls, "text-blue-500")} />;
	return <FileIcon className={cls} />;
}

function getExt(name: string): string {
	return name.split(".").pop()?.toUpperCase() || "";
}

function matchesMime(mime: string, patterns: string[]): boolean {
	return patterns.some((p) => {
		if (p.startsWith(".")) return mime.includes(p.slice(1));
		if (p.endsWith("/*")) return mime.startsWith(p.slice(0, -1));
		return mime === p;
	});
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditableFiles<E extends EntityType>({
	entity,
	entityId,
	field,
	value,
	label,
	className,
	disabled = false,
	accept,
	maxSizeMB = 10,
	maxFiles = 10,
	variant = "card",
	trigger,
	showSize = true,
	enableRealtime = true,
	storageProvider,
	onSuccess,
	onError,
}: EditableFilesProps<E>) {
	const isDraft = useIsDraft();
	const inputRef = useRef<HTMLInputElement>(null);

	const [files, setFiles] = useState<FileRecord[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	// ==========================================================================
	// LOAD
	// ==========================================================================

	useEffect(() => {
		if (isDraft) {
			setIsLoading(false);
			return;
		}
		loadFiles();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [entity, entityId, isDraft]);

	const loadFiles = async () => {
		setIsLoading(true);
		try {
			const supabase = getSupabaseClient();
			const storage = getStorageService();

			const { data: links, error: le } = await supabase
				.from("entity_files")
				.select("file_id, sort_order")
				.eq("entity_type", entity)
				.eq("entity_id", entityId)
				.order("sort_order");

			if (le) throw le;
			if (!links?.length) {
				setFiles([]);
				setIsLoading(false);
				return;
			}

			const { data: recs, error: fe } = await supabase
				.from("files")
				.select(
					"id, original_name, mime_type, size, storage_path, provider_id, description",
				)
				.in(
					"id",
					links.map((l) => l.file_id),
				);

			if (fe) throw fe;

			const withUrls = await Promise.all(
				(recs || []).map(async (f) => {
					try {
						const { url } = await storage.getSignedUrl(
							f.storage_path,
							3600,
							f.provider_id || undefined,
						);
						return { ...f, url };
					} catch {
						return { ...f, url: undefined };
					}
				}),
			);

			const sorted = links
				.map((l) => withUrls.find((f) => f.id === l.file_id))
				.filter(Boolean) as FileRecord[];

			setFiles(sorted);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	// ==========================================================================
	// REALTIME
	// ==========================================================================

	useEffect(() => {
		if (isDraft || !enableRealtime) return;
		const supabase = getSupabaseClient();
		const ch = supabase
			.channel(`ef:${entity}:${entityId}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "entity_files" },
				(p) => {
					if (p.eventType === "INSERT") {
						const row = p.new as any;
						if (
							row?.entity_type === entity &&
							row?.entity_id === entityId
						) {
							loadFiles();
						}
					} else if (p.eventType === "DELETE") {
						// Тихий refetch — без мерцания
						const supabase = getSupabaseClient();
						supabase
							.from("entity_files")
							.select("file_id")
							.eq("entity_type", entity)
							.eq("entity_id", entityId)
							.then(({ data }) => {
								if (data) {
									const serverIds = data.map(
										(ef) => ef.file_id,
									);
									setFiles((prev) =>
										prev.filter((f) =>
											serverIds.includes(f.id),
										),
									);
								}
							});
					}
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [entity, entityId, isDraft, enableRealtime]);

	// ==========================================================================
	// VALIDATE
	// ==========================================================================

	const validate = useCallback(
		(f: File): string | null => {
			if (accept?.length && !matchesMime(f.type, accept))
				return `"${f.type}" not allowed`;
			if (f.size > maxSizeMB * 1024 * 1024)
				return `"${f.name}" exceeds ${maxSizeMB}MB`;
			if (files.filter((x) => !x._uploading).length >= maxFiles)
				return `Maximum ${maxFiles} files`;
			return null;
		},
		[accept, maxSizeMB, maxFiles, files],
	);

	// ==========================================================================
	// UPLOAD — instant placeholders
	// ==========================================================================

	const uploadFiles = useCallback(
		async (fileList: FileList | File[]) => {
			const toUpload = Array.from(fileList);
			const realCount = files.filter((x) => !x._uploading).length;

			if (realCount + toUpload.length > maxFiles) {
				setError(
					`Max ${maxFiles} files. Have ${realCount}, adding ${toUpload.length}.`,
				);
				return;
			}

			for (const f of toUpload) {
				const err = validate(f);
				if (err) {
					setError(err);
					return;
				}
			}

			setError(null);

			// ✅ INSTANT PLACEHOLDERS — файлы появляются сразу
			const placeholders: FileRecord[] = toUpload.map((f) => ({
				id: crypto.randomUUID(),
				original_name: f.name,
				mime_type: f.type,
				size: f.size,
				storage_path: "",
				provider_id: null,
				description: null,
				_uploading: true,
				_localUrl: f.type.startsWith("image/")
					? URL.createObjectURL(f)
					: undefined,
			}));

			setFiles((prev) => [...prev, ...placeholders]);

			// Upload каждый параллельно
			const supabase = getSupabaseClient();
			const storage = getStorageService();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setError("Not authenticated");
				return;
			}

			await Promise.all(
				toUpload.map(async (file, i) => {
					const placeholder = placeholders[i];
					const ext = file.name.split(".").pop() || "bin";
					// ✅ Путь: user_id/entity_type/file_id.ext
					const storagePath = `${user.id}/${entity}/${placeholder.id}.${ext}`;

					try {
						const uploadResult = await storage.upload(
							file,
							storagePath,
							{
								providerId: storageProvider,
								contentType: file.type,
							},
						);

						const { data: fileRecord, error: dbErr } =
							await supabase
								.from("files")
								.insert({
									id: placeholder.id,
									original_name: file.name,
									mime_type: file.type,
									size: file.size,
									storage_path: uploadResult.path,
									provider_id: uploadResult.providerId,
								})
								.select()
								.single();

						if (dbErr) {
							await storage.delete(
								[storagePath],
								storageProvider,
							);
							throw dbErr;
						}

						if (!isDraft) {
							await supabase.from("entity_files").insert({
								file_id: placeholder.id,
								entity_type: entity,
								entity_id: entityId,
								sort_order: files.length + i,
							});

							const { url } = await storage.getSignedUrl(
								uploadResult.path,
								3600,
								uploadResult.providerId,
							);

							// Заменяем placeholder на реальный файл
							setFiles((prev) =>
								prev.map((f) =>
									f.id === placeholder.id
										? {
												...fileRecord,
												url,
												_uploading: false,
											}
										: f,
								),
							);
						} else {
							const ids =
								(
									useStore.getState().entities[entity]?.[
										entityId
									] as any
								)?.[field] || [];
							useStore
								.getState()
								.updateField(entity, entityId, field as any, [
									...ids,
									placeholder.id,
								]);

							setFiles((prev) =>
								prev.map((f) =>
									f.id === placeholder.id
										? {
												...fileRecord,
												url: placeholder._localUrl,
												_uploading: false,
											}
										: f,
								),
							);
						}
					} catch (err: any) {
						console.error("[EditableFiles] Upload error:", err);
						// Убираем сломанный placeholder
						setFiles((prev) =>
							prev.filter((f) => f.id !== placeholder.id),
						);
						setError(err.message);
						onError?.(err.message);
					}
				}),
			);

			onSuccess?.();
		},
		[
			entity,
			entityId,
			field,
			files,
			maxFiles,
			isDraft,
			storageProvider,
			validate,
			onSuccess,
			onError,
		],
	);

	// ==========================================================================
	// REMOVE
	// ==========================================================================

	const removeFile = useCallback(
		async (fileId: string) => {
			const file = files.find((f) => f.id === fileId);
			if (!file) return;

			setFiles((prev) => prev.filter((f) => f.id !== fileId));

			if (file._localUrl) URL.revokeObjectURL(file._localUrl);

			if (isDraft) {
				const ids =
					(useStore.getState().entities[entity]?.[entityId] as any)?.[
						field
					] || [];
				useStore.getState().updateField(
					entity,
					entityId,
					field as any,
					ids.filter((id: string) => id !== fileId),
				);
				return;
			}

			try {
				const supabase = getSupabaseClient();
				const storage = getStorageService();
				await supabase
					.from("entity_files")
					.delete()
					.eq("file_id", fileId)
					.eq("entity_type", entity)
					.eq("entity_id", entityId);
				await supabase.from("files").delete().eq("id", fileId);
				if (file.storage_path)
					await storage.delete(
						[file.storage_path],
						file.provider_id || undefined,
					);
				onSuccess?.();
			} catch (err: any) {
				setFiles((prev) => [...prev, file]);
				setError(err.message);
			}
		},
		[entity, entityId, field, files, isDraft, onSuccess],
	);

	// ==========================================================================
	// HANDLERS
	// ==========================================================================

	const openPicker = () => inputRef.current?.click();
	const onDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);
	const onDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);
	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
		},
		[uploadFiles],
	);
	const onInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files?.length) {
				uploadFiles(e.target.files);
				e.target.value = "";
			}
		},
		[uploadFiles],
	);

	const canUpload =
		!disabled && files.filter((f) => !f._uploading).length < maxFiles;
	const acceptStr = accept?.join(",");
	const realFileCount = files.filter((f) => !f._uploading).length;

	// ==========================================================================
	// LOADING STATE
	// ==========================================================================

	if (isLoading) {
		return (
			<div className={cn("space-y-2", className)}>
				{label && <Label>{label}</Label>}
				<div className="flex gap-2">
					<Skeleton className="h-16 w-16 rounded-lg" />
					<Skeleton className="h-16 w-16 rounded-lg" />
				</div>
			</div>
		);
	}

	// ==========================================================================
	// HIDDEN INPUT
	// ==========================================================================

	const hiddenInput = (
		<input
			ref={inputRef}
			type="file"
			multiple
			accept={acceptStr}
			onChange={onInputChange}
			className="hidden"
		/>
	);

	// ==========================================================================
	// COMPACT VARIANT — кнопка "+" и карточки в одну строку
	// ==========================================================================

	if (variant === "compact") {
		return (
			<div className={cn("space-y-2", className)}>
				{label && (
					<div className="flex items-center justify-between">
						<Label>
							{label}
							{realFileCount > 0 && (
								<span className="text-muted-foreground font-normal ml-1">
									{realFileCount}
								</span>
							)}
						</Label>
						{canUpload && (
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6"
								onClick={openPicker}
								disabled={disabled}
							>
								<Plus className="h-4 w-4" />
							</Button>
						)}
					</div>
				)}
				{hiddenInput}

				{files.length === 0 ? (
					<div
						className="text-center py-4 border border-dashed rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
						onClick={openPicker}
					>
						<p className="text-sm text-muted-foreground">
							Нет файлов
						</p>
						<p className="text-xs text-muted-foreground/70 mt-0.5">
							{accept
								? accept
										.map((a) =>
											a
												.replace("/*", "")
												.replace("application/", "."),
										)
										.join(", ")
								: "Any file"}{" "}
							· Max {maxSizeMB}MB · {realFileCount}/{maxFiles}
						</p>
					</div>
				) : (
					<div className="flex flex-wrap gap-2">
						{files.map((f) => (
							<CompactCard
								key={f.id}
								file={f}
								showSize={showSize}
								disabled={disabled}
								onRemove={() => removeFile(f.id)}
							/>
						))}
					</div>
				)}

				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>
		);
	}

	// ==========================================================================
	// TRIGGER VARIANT — только кнопка
	// ==========================================================================

	if (variant === "trigger") {
		return (
			<>
				{hiddenInput}
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							{trigger ? (
								<div onClick={openPicker}>{trigger}</div>
							) : (
								<Button
									variant="ghost"
									size="icon"
									onClick={openPicker}
									disabled={!canUpload}
									className="h-8 w-8"
								>
									<Paperclip className="h-4 w-4" />
								</Button>
							)}
						</TooltipTrigger>
						<TooltipContent>
							<p>
								Attach file ({realFileCount}/{maxFiles})
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</>
		);
	}

	// ==========================================================================
	// CARD / LIST VARIANT
	// ==========================================================================

	return (
		<div className={cn("space-y-3", className)}>
			{label && (
				<Label>
					{label}
					{realFileCount > 0 && (
						<span className="text-muted-foreground font-normal ml-1">
							{realFileCount}
						</span>
					)}
				</Label>
			)}
			{hiddenInput}

			{/* Files */}
			{files.length > 0 && (
				<div
					className={cn(
						variant === "card"
							? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2"
							: "space-y-1.5",
					)}
				>
					{files.map((f) =>
						variant === "card" ? (
							<CardPreview
								key={f.id}
								file={f}
								showSize={showSize}
								disabled={disabled}
								onRemove={() => removeFile(f.id)}
							/>
						) : (
							<ListPreview
								key={f.id}
								file={f}
								showSize={showSize}
								disabled={disabled}
								onRemove={() => removeFile(f.id)}
							/>
						),
					)}
				</div>
			)}

			{/* Dropzone */}
			{canUpload && (
				<div
					onDragOver={onDragOver}
					onDragLeave={onDragLeave}
					onDrop={onDrop}
					onClick={openPicker}
					className={cn(
						"border border-dashed rounded-lg p-4 flex flex-col items-center gap-1.5 cursor-pointer transition-colors",
						isDragging
							? "border-primary bg-primary/5"
							: "border-muted-foreground/25 hover:border-muted-foreground/50",
					)}
				>
					<Upload className="h-5 w-5 text-muted-foreground" />
					<p className="text-xs text-muted-foreground">
						{isDragging ? "Drop here" : "Click or drag"}
					</p>
					<p className="text-[10px] text-muted-foreground/60">
						{accept
							? accept
									.map((a) =>
										a
											.replace("/*", "")
											.replace("application/", "."),
									)
									.join(", ")
							: "Any"}{" "}
						· {maxSizeMB}MB · {realFileCount}/{maxFiles}
					</p>
				</div>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}

// ============================================================================
// CARD PREVIEW (маленькие квадратики)
// ============================================================================

function CardPreview({
	file,
	showSize,
	disabled,
	onRemove,
}: {
	file: FileRecord;
	showSize: boolean;
	disabled: boolean;
	onRemove: () => void;
}) {
	const isImage = file.mime_type.startsWith("image/");
	const previewUrl = file._localUrl || file.url;

	return (
		<div className="group relative">
			{/* Remove button */}
			{!disabled && !file._uploading && (
				<button
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className={cn(
						"absolute -top-1.5 -right-1.5 z-10",
						"h-5 w-5 rounded-full border bg-background shadow-sm",
						"flex items-center justify-center",
						"text-muted-foreground/50 hover:text-foreground",
						"opacity-0 group-hover:opacity-100 transition-opacity",
					)}
				>
					<X className="h-2.5 w-2.5" />
				</button>
			)}

			<div
				className={cn(
					"aspect-square rounded-lg overflow-hidden border",
					file._uploading && "animate-pulse",
				)}
			>
				{file._uploading ? (
					/* Skeleton placeholder */
					<div className="w-full h-full flex items-center justify-center bg-muted">
						{isImage && previewUrl ? (
							<img
								src={previewUrl}
								alt=""
								className="w-full h-full object-cover opacity-40"
							/>
						) : (
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						)}
					</div>
				) : isImage && previewUrl ? (
					<img
						src={previewUrl}
						alt={file.original_name}
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="w-full h-full bg-muted/40 flex flex-col items-center justify-center gap-0.5 p-1.5">
						{getFileIcon(file.mime_type, "h-4 w-4")}
						<span className="text-[8px] font-medium text-muted-foreground uppercase leading-none">
							{getExt(file.original_name)}
						</span>
					</div>
				)}
			</div>

			{/* Name tooltip */}
			<p
				className="text-[9px] text-muted-foreground truncate mt-0.5 px-0.5"
				title={file.original_name}
			>
				{file.original_name}
			</p>
		</div>
	);
}

// ============================================================================
// LIST PREVIEW
// ============================================================================

function ListPreview({
	file,
	showSize,
	disabled,
	onRemove,
}: {
	file: FileRecord;
	showSize: boolean;
	disabled: boolean;
	onRemove: () => void;
}) {
	const isImage = file.mime_type.startsWith("image/");
	const previewUrl = file._localUrl || file.url;

	return (
		<div className="group flex items-center gap-2.5 p-2 border rounded-lg bg-card">
			{file._uploading ? (
				<Skeleton className="h-8 w-8 rounded flex-shrink-0" />
			) : isImage && previewUrl ? (
				<div className="h-8 w-8 rounded overflow-hidden bg-muted flex-shrink-0">
					<img
						src={previewUrl}
						alt=""
						className="w-full h-full object-cover"
					/>
				</div>
			) : (
				<div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center flex-shrink-0">
					{getFileIcon(file.mime_type, "h-3.5 w-3.5")}
				</div>
			)}

			<div className="flex-1 min-w-0">
				{file._uploading ? (
					<Skeleton className="h-3 w-24" />
				) : (
					<>
						<p className="text-xs font-medium truncate">
							{file.original_name}
						</p>
						{showSize && (
							<p className="text-[10px] text-muted-foreground">
								{getExt(file.original_name)} ·{" "}
								{formatFileSize(file.size)}
							</p>
						)}
					</>
				)}
			</div>

			{!disabled && !file._uploading && (
				<button
					onClick={onRemove}
					className="h-6 w-6 rounded flex items-center justify-center flex-shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors"
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</div>
	);
}

// ============================================================================
// COMPACT CARD (для variant="compact")
// ============================================================================

function CompactCard({
	file,
	showSize,
	disabled,
	onRemove,
}: {
	file: FileRecord;
	showSize: boolean;
	disabled: boolean;
	onRemove: () => void;
}) {
	const isImage = file.mime_type.startsWith("image/");
	const previewUrl = file._localUrl || file.url;

	return (
		<div className="group relative inline-flex items-center gap-1.5 border rounded-md px-2 py-1.5 bg-card text-xs">
			{file._uploading ? (
				<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
			) : isImage && previewUrl ? (
				<div className="h-4 w-4 rounded overflow-hidden flex-shrink-0">
					<img
						src={previewUrl}
						alt=""
						className="w-full h-full object-cover"
					/>
				</div>
			) : (
				getFileIcon(file.mime_type, "h-3.5 w-3.5")
			)}

			<span className="max-w-[120px] truncate">
				{file._uploading ? "Uploading..." : file.original_name}
			</span>

			{showSize && !file._uploading && (
				<span className="text-muted-foreground">
					{formatFileSize(file.size)}
				</span>
			)}

			{!disabled && !file._uploading && (
				<button
					onClick={onRemove}
					className="ml-0.5 text-muted-foreground/40 hover:text-foreground transition-colors"
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</div>
	);
}

// ============================================================================
// REGISTRY CONFIG
// ============================================================================

// files: {
//     component: EditableFiles,
//     label: "Файлы",
//     relation: {
//         type: "m2m",
//         junctionTable: "entity_files",
//         foreignKey: "file_id",
//         polymorphic: true,
//     },
//     props: {
//         accept: ["image/*", "application/pdf", ".doc", ".docx", ".xls", ".xlsx"],
//         maxSizeMB: 10,
//         maxFiles: 10,
//         variant: "card",
//     },
// },

// ============================================================================
// VARIANT: "card" — сетка карточек (по умолчанию)
// ============================================================================
// <EntityField entity="notes" entityId={id} name="files" />
//
// Или с кастомными настройками:
// <EditableFiles
//     entity="notes" entityId={id} field="files"
//     label="Файлы"
//     variant="card"
//     accept={["image/*"]}
//     maxFiles={20}
// />

// ============================================================================
// VARIANT: "list" — горизонтальные строки
// ============================================================================
// <EditableFiles
//     entity="notes" entityId={id} field="files"
//     label="Documents"
//     variant="list"
//     accept={["application/pdf", ".doc", ".docx"]}
// />

// ============================================================================
// VARIANT: "compact" — кнопка "+" в заголовке, чипы файлов
// ============================================================================
// <EditableFiles
//     entity="notes" entityId={id} field="files"
//     label="Файлы"
//     variant="compact"
//     maxFiles={5}
// />
//
// Результат:
// ┌──────────────────────────────────┐
// │ Файлы 3                      +  │
// │ [📄 doc.pdf x] [🖼 photo.jpg x] │
// └──────────────────────────────────┘

// ============================================================================
// VARIANT: "trigger" — только кнопка (файлы рендерятся отдельно)
// ============================================================================
// Полезно когда кнопка прикрепления в одном месте, а файлы в другом.
//
// <div className="toolbar">
//     <EditableFiles
//         entity="notes" entityId={id} field="files"
//         variant="trigger"
//         trigger={<Button size="sm"><Paperclip /> Attach</Button>}
//     />
// </div>
//
// <div className="content">
//     {/* Файлы показываются отдельно, через EntityField с другим variant */}
//     <EditableFiles entity="notes" entityId={id} field="files" variant="card" />
// </div>

// ============================================================================
// STORAGE PATH FORMAT
// ============================================================================
// user_id/entity_type/file_id.ext
// Примеры:
//   4c1a224d-.../notes/a1b2c3d4-....pdf
//   4c1a224d-.../tasks/e5f6g7h8-....jpg

// ============================================================================
// КОНФИГУРАЦИИ ПО НАЗНАЧЕНИЮ
// ============================================================================

// Галерея (только картинки, card):
// props: { accept: ["image/*"], maxSizeMB: 5, maxFiles: 20, variant: "card" }

// Документы (PDF/Office, list):
// props: { accept: ["application/pdf", ".doc", ".docx", ".xls", ".xlsx"], maxSizeMB: 20, maxFiles: 5, variant: "list" }

// Аватар (одна картинка):
// props: { accept: ["image/jpeg", "image/png", "image/webp"], maxSizeMB: 5, maxFiles: 1, variant: "compact" }

// Чат (любые, compact):
// props: { maxSizeMB: 50, maxFiles: 20, variant: "compact" }

// Кнопка в toolbar (trigger):
// props: { variant: "trigger" }

export {};
