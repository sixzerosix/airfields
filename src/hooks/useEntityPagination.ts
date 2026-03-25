"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQueryState, parseAsInteger } from "nuqs";

// ============================================================================
// TYPES
// ============================================================================

export type PaginationMode = "pages" | "loadMore" | "infinite";

export interface UseEntityPaginationConfig {
	/** Режим пагинации */
	mode?: PaginationMode;

	/** Элементов на страницу @default 25 */
	defaultPerPage?: number;

	/** Варианты для "Rows per page" */
	perPageOptions?: number[];

	/** Синхронизировать page/perPage в URL? @default true для pages, false для остальных */
	syncUrl?: boolean;
}

export interface UseEntityPaginationReturn {
	mode: PaginationMode;

	// State
	page: number;
	perPage: number;
	totalItems: number;
	totalPages: number;

	// Computed
	startIndex: number;
	endIndex: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;

	// Actions
	setPage: (page: number) => void;
	setPerPage: (perPage: number) => void;
	nextPage: () => void;
	prevPage: () => void;
	goToFirst: () => void;
	goToLast: () => void;
	loadMore: () => void;

	/** Применить пагинацию к массиву (вызывай ПОСЛЕ applyTo фильтров) */
	paginate: <T>(items: T[]) => T[];

	/** Конфиг для UI */
	perPageOptions: number[];

	/** Для infinite scroll — ref callback */
	sentinelRef: (node: HTMLElement | null) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEntityPagination(
	config: UseEntityPaginationConfig = {},
): UseEntityPaginationReturn {
	const {
		mode = "pages",
		defaultPerPage = 25,
		perPageOptions = [10, 25, 50, 100],
		syncUrl,
	} = config;

	// URL sync only for "pages" mode by default
	const shouldSyncUrl = syncUrl ?? mode === "pages";

	// ==========================================================================
	// URL STATE (nuqs) — only for pages mode
	// ==========================================================================

	const [urlPage, setUrlPage] = useQueryState(
		"page",
		parseAsInteger.withDefault(1).withOptions({ shallow: true }),
	);

	const [urlPerPage, setUrlPerPage] = useQueryState(
		"perPage",
		parseAsInteger.withDefault(defaultPerPage).withOptions({ shallow: true }),
	);

	// ==========================================================================
	// LOCAL STATE — for loadMore / infinite
	// ==========================================================================

	const [localPage, setLocalPage] = useState(1);
	const [localPerPage, setLocalPerPage] = useState(defaultPerPage);

	// "loadMore" and "infinite" show items 1..page*perPage (cumulative)
	const [loadedPages, setLoadedPages] = useState(1);

	// ==========================================================================
	// UNIFIED GETTERS/SETTERS
	// ==========================================================================

	const page = shouldSyncUrl ? urlPage : (mode === "pages" ? localPage : loadedPages);
	const perPage = shouldSyncUrl ? urlPerPage : localPerPage;

	const setPage = useCallback(
		(p: number) => {
			const clamped = Math.max(1, p);
			if (shouldSyncUrl) {
				setUrlPage(clamped <= 1 ? null : clamped); // page=1 → remove from URL
			} else if (mode === "pages") {
				setLocalPage(clamped);
			} else {
				setLoadedPages(clamped);
			}
		},
		[shouldSyncUrl, mode, setUrlPage],
	);

	const setPerPage = useCallback(
		(pp: number) => {
			if (shouldSyncUrl) {
				setUrlPerPage(pp === defaultPerPage ? null : pp); // default → remove from URL
				setUrlPage(null); // reset to page 1
			} else {
				setLocalPerPage(pp);
				setLocalPage(1);
				setLoadedPages(1);
			}
		},
		[shouldSyncUrl, defaultPerPage, setUrlPerPage, setUrlPage],
	);

	// ==========================================================================
	// TOTAL (set by paginate())
	// ==========================================================================

	const totalItemsRef = useRef(0);
	const [totalItems, setTotalItems] = useState(0);

	const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

	// ==========================================================================
	// NAVIGATION
	// ==========================================================================

	const hasNextPage = page < totalPages;
	const hasPrevPage = page > 1;
	const startIndex = (page - 1) * perPage;
	const endIndex = Math.min(startIndex + perPage, totalItems);

	const nextPage = useCallback(() => {
		if (mode === "pages") {
			setPage(Math.min(page + 1, totalPages));
		} else {
			// loadMore / infinite — increment loaded pages
			setLoadedPages((p) => p + 1);
		}
	}, [mode, page, totalPages, setPage]);

	const prevPage = useCallback(() => setPage(Math.max(page - 1, 1)), [page, setPage]);
	const goToFirst = useCallback(() => setPage(1), [setPage]);
	const goToLast = useCallback(() => setPage(totalPages), [totalPages, setPage]);
	const loadMore = useCallback(() => nextPage(), [nextPage]);

	// ==========================================================================
	// INFINITE SCROLL — IntersectionObserver
	// ==========================================================================

	const observerRef = useRef<IntersectionObserver | null>(null);
	const sentinelNodeRef = useRef<HTMLElement | null>(null);

	const sentinelRef = useCallback(
		(node: HTMLElement | null) => {
			// Cleanup previous observer
			if (observerRef.current) {
				observerRef.current.disconnect();
			}

			if (mode !== "infinite" || !node) {
				sentinelNodeRef.current = null;
				return;
			}

			sentinelNodeRef.current = node;

			observerRef.current = new IntersectionObserver(
				(entries) => {
					if (entries[0]?.isIntersecting && hasNextPage) {
						setLoadedPages((p) => p + 1);
					}
				},
				{ rootMargin: "200px" },
			);

			observerRef.current.observe(node);
		},
		[mode, hasNextPage],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			observerRef.current?.disconnect();
		};
	}, []);

	// ==========================================================================
	// PAGINATE
	// ==========================================================================

	const paginate = useCallback(
		<T,>(items: T[]): T[] => {
			// Update total
			if (items.length !== totalItemsRef.current) {
				totalItemsRef.current = items.length;
				setTotalItems(items.length);
			}

			if (mode === "pages") {
				// Classic: show only current page
				const start = (page - 1) * perPage;
				return items.slice(start, start + perPage);
			} else {
				// loadMore / infinite: show first N*perPage items (cumulative)
				return items.slice(0, loadedPages * perPage);
			}
		},
		[mode, page, perPage, loadedPages],
	);

	return {
		mode,
		page, perPage, totalItems, totalPages,
		startIndex, endIndex, hasNextPage, hasPrevPage,
		setPage, setPerPage, nextPage, prevPage, goToFirst, goToLast, loadMore,
		paginate, perPageOptions, sentinelRef,
	};
}