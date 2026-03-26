"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryState, parseAsInteger } from "nuqs";

// ============================================================================
// TYPES
// ============================================================================

export type PaginationMode = "pages" | "loadMore" | "infinite";

export interface UseEntityPaginationConfig {
	mode?: PaginationMode;
	defaultPerPage?: number;
	perPageOptions?: number[];
	syncUrl?: boolean;
}

export interface UseEntityPaginationReturn {
	mode: PaginationMode;
	page: number;
	perPage: number;
	totalItems: number;
	totalPages: number;
	startIndex: number;
	endIndex: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	setPage: (page: number) => void;
	setPerPage: (perPage: number) => void;
	nextPage: () => void;
	prevPage: () => void;
	goToFirst: () => void;
	goToLast: () => void;
	loadMore: () => void;
	paginate: <T>(items: T[]) => T[];
	perPageOptions: number[];
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

	const shouldSyncUrl = syncUrl ?? mode === "pages";

	// ==========================================================================
	// URL STATE (nuqs)
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
	// LOCAL STATE
	// ==========================================================================

	const [localPage, setLocalPage] = useState(1);
	const [localPerPage, setLocalPerPage] = useState(defaultPerPage);
	const [loadedPages, setLoadedPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);

	// ==========================================================================
	// GETTERS
	// ==========================================================================

	const rawPage = shouldSyncUrl ? urlPage : (mode === "pages" ? localPage : loadedPages);
	const perPage = shouldSyncUrl ? urlPerPage : localPerPage;
	const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

	// ✅ Clamp page — чистое вычисление, без setState
	const page = Math.min(Math.max(1, rawPage), totalPages);

	// ==========================================================================
	// SETTERS
	// ==========================================================================

	const setPage = useCallback(
		(p: number) => {
			const clamped = Math.max(1, p);
			if (shouldSyncUrl) {
				setUrlPage(clamped <= 1 ? null : clamped);
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
				setUrlPerPage(pp === defaultPerPage ? null : pp);
				setUrlPage(null);
			} else {
				setLocalPerPage(pp);
				setLocalPage(1);
				setLoadedPages(1);
			}
		},
		[shouldSyncUrl, defaultPerPage, setUrlPerPage, setUrlPage],
	);

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
			setLoadedPages((p) => p + 1);
		}
	}, [mode, page, totalPages, setPage]);

	const prevPage = useCallback(() => setPage(Math.max(page - 1, 1)), [page, setPage]);
	const goToFirst = useCallback(() => setPage(1), [setPage]);
	const goToLast = useCallback(() => setPage(totalPages), [totalPages, setPage]);
	const loadMore = useCallback(() => nextPage(), [nextPage]);

	// ==========================================================================
	// INFINITE SCROLL
	// ==========================================================================

	const observerRef = useRef<IntersectionObserver | null>(null);

	const sentinelRef = useCallback(
		(node: HTMLElement | null) => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}

			if (mode !== "infinite" || !node) return;

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

	useEffect(() => {
		return () => {
			observerRef.current?.disconnect();
		};
	}, []);

	// ==========================================================================
	// ✅ PAGINATE — чистая функция, НОЛЬ setState
	// ==========================================================================
	// totalItems обновляется через lastItemsCountRef + useEffect ниже.

	const lastItemsCountRef = useRef(0);

	const paginate = useCallback(
		<T,>(items: T[]): T[] => {
			// Запоминаем длину в ref (не setState!)
			lastItemsCountRef.current = items.length;

			if (mode === "pages") {
				const start = (page - 1) * perPage;
				return items.slice(start, start + perPage);
			} else {
				return items.slice(0, loadedPages * perPage);
			}
		},
		[mode, page, perPage, loadedPages],
	);

	// ✅ Обновляем totalItems через useEffect (ПОСЛЕ рендера, не во время)
	useEffect(() => {
		if (lastItemsCountRef.current !== totalItems) {
			setTotalItems(lastItemsCountRef.current);
		}
	});

	return {
		mode,
		page, perPage, totalItems, totalPages,
		startIndex, endIndex, hasNextPage, hasPrevPage,
		setPage, setPerPage, nextPage, prevPage, goToFirst, goToLast, loadMore,
		paginate, perPageOptions, sentinelRef,
	};
}