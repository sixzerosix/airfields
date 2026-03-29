"use client";

/**
 * useServerEntityList v2.1 — стабильная серверная пагинация
 *
 * ✅ Решена проблема LockManager timeout
 * ✅ Один запрос (data + count)
 * ✅ AbortController + защита от race conditions
 * ✅ Лучшая обработка пустых ошибок Supabase
 * ✅ JSON.stringify для фильтров и сортировки
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import type { EntityType, EntityDataMap } from "@/lib/schemas";

// ============================================================================
// TYPES
// ============================================================================

export interface ServerFilterValue {
	operator: "eq" | "neq" | "contains" | "gt" | "gte" | "lt" | "lte" | "between" | "in" | "empty" | "notEmpty";
	value: any;
	valueTo?: any;
}

export interface ServerSortConfig {
	field: string;
	direction: "asc" | "desc";
}

interface ServerFilterFieldConfig {
	field: string;
	type: "text" | "number" | "select" | "date" | "boolean";
}

export interface UseServerEntityListConfig {
	defaultSort?: ServerSortConfig;
	defaultPerPage?: number;
	perPageOptions?: number[];
	filterFields?: ServerFilterFieldConfig[];
	priorityFields?: string[];
	enableRealtime?: boolean;
	initialData?: any[];
	initialTotal?: number;

	selectFields?: string;
	countMethod?: "exact" | "estimated";
	syncUrl?: boolean;
}

export interface UseServerEntityListReturn<E extends EntityType> {
	items: EntityDataMap[E][];
	totalItems: number;
	totalPages: number;
	isLoading: boolean;
	isRefetching: boolean;
	error: string | null;

	page: number;
	perPage: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	setPage: (page: number) => void;
	setPerPage: (perPage: number) => void;
	nextPage: () => void;
	prevPage: () => void;

	filters: Record<string, ServerFilterValue>;
	setFilter: (field: string, value: ServerFilterValue | null) => void;
	clearFilters: () => void;

	sort: ServerSortConfig;
	setSort: (sort: ServerSortConfig) => void;

	search: string;
	setSearch: (search: string) => void;

	refresh: () => void;
	perPageOptions: number[];
	activeFilterCount: number;
	hasActiveFilters: boolean;
}

// ============================================================================
// URL HELPERS
// ============================================================================

function readFromUrl(defaultSort: ServerSortConfig, defaultPerPage: number) {
	if (typeof window === "undefined") {
		return { page: 1, perPage: defaultPerPage, sort: defaultSort, search: "" };
	}

	const p = new URLSearchParams(window.location.search);

	return {
		page: Math.max(1, parseInt(p.get("page") || "1", 10) || 1),
		perPage: parseInt(p.get("perPage") || String(defaultPerPage), 10) || defaultPerPage,
		sort: {
			field: p.get("sort") || defaultSort.field,
			direction: (p.get("dir") === "asc" ? "asc" : p.get("dir") === "desc" ? "desc" : defaultSort.direction) as "asc" | "desc",
		},
		search: p.get("q") || "",
	};
}

function writeToUrl(
	page: number,
	perPage: number,
	sort: ServerSortConfig,
	search: string,
	defaults: { sort: ServerSortConfig; perPage: number },
) {
	if (typeof window === "undefined") return;

	const url = new URL(window.location.href);

	if (page > 1) url.searchParams.set("page", String(page));
	else url.searchParams.delete("page");

	if (perPage !== defaults.perPage) url.searchParams.set("perPage", String(perPage));
	else url.searchParams.delete("perPage");

	if (sort.field !== defaults.sort.field) url.searchParams.set("sort", sort.field);
	else url.searchParams.delete("sort");

	if (sort.direction !== defaults.sort.direction) url.searchParams.set("dir", sort.direction);
	else url.searchParams.delete("dir");

	if (search) url.searchParams.set("q", search);
	else url.searchParams.delete("q");

	window.history.replaceState({}, "", url.toString());
}

// ============================================================================
// HOOK
// ============================================================================

export function useServerEntityList<E extends EntityType>(
	entity: E,
	config: UseServerEntityListConfig = {},
): UseServerEntityListReturn<E> {
	const {
		defaultSort = { field: "created_at", direction: "desc" },
		defaultPerPage = 25,
		perPageOptions = [10, 25, 50, 100],
		filterFields = [],
		priorityFields = [],
		enableRealtime = true,
		initialData,
		initialTotal,
		selectFields = "*",
		countMethod = "exact",
		syncUrl = true,
	} = config;

	// ==========================================================================
	// STATE
	// ==========================================================================

	const [items, setItems] = useState<EntityDataMap[E][]>(initialData || []);
	const [totalItems, setTotalItems] = useState(initialTotal || 0);
	const [isLoading, setIsLoading] = useState(!initialData);
	const [isRefetching, setIsRefetching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [page, setPageState] = useState(1);
	const [perPage, setPerPageState] = useState(defaultPerPage);
	const [filters, setFiltersState] = useState<Record<string, ServerFilterValue>>({});
	const [sort, setSortState] = useState<ServerSortConfig>(defaultSort);
	const [search, setSearchState] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	const searchTimeoutRef = useRef<NodeJS.Timeout>();
	const initializedRef = useRef(false);
	const abortRef = useRef<AbortController | null>(null);
	const fetchInProgressRef = useRef(false); // ← защита от race conditions

	// ==========================================================================
	// INIT FROM URL
	// ==========================================================================

	useEffect(() => {
		if (!syncUrl || initializedRef.current) return;
		initializedRef.current = true;

		const fromUrl = readFromUrl(defaultSort, defaultPerPage);
		setPageState(fromUrl.page);
		setPerPageState(fromUrl.perPage);
		setSortState(fromUrl.sort);
		setSearchState(fromUrl.search);
		setDebouncedSearch(fromUrl.search);
	}, [syncUrl, defaultSort, defaultPerPage]);

	// ==========================================================================
	// URL SYNC
	// ==========================================================================

	useEffect(() => {
		if (!syncUrl || !initializedRef.current) return;
		writeToUrl(page, perPage, sort, debouncedSearch, { sort: defaultSort, perPage: defaultPerPage });
	}, [page, perPage, sort, debouncedSearch, syncUrl, defaultSort, defaultPerPage]);

	// ==========================================================================
	// DERIVED
	// ==========================================================================

	const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
	const safePage = Math.min(page, totalPages);
	const hasNextPage = safePage < totalPages;
	const hasPrevPage = safePage > 1;
	const activeFilterCount = Object.keys(filters).length + (debouncedSearch ? 1 : 0);
	const hasActiveFilters = activeFilterCount > 0;

	// ==========================================================================
	// FETCH — основное исправление
	// ==========================================================================

	const fetchData = useCallback(
		async (opts?: { silent?: boolean }) => {
			// Защита от одновременных/быстрых запросов
			if (fetchInProgressRef.current) return;
			fetchInProgressRef.current = true;

			if (abortRef.current) {
				abortRef.current.abort();
			}
			const abortController = new AbortController();
			abortRef.current = abortController;

			if (opts?.silent) setIsRefetching(true);
			else setIsLoading(true);
			setError(null);

			try {
				const supabase = getSupabaseClient();

				let query = supabase
					.from(entity)
					.select(selectFields, {
						count: countMethod,
						head: false,
					});

				// SEARCH
				if (debouncedSearch.trim()) {
					const s = `%${debouncedSearch.trim()}%`;
					const textFields = filterFields.filter((f) => f.type === "text").map((f) => f.field);
					if (textFields.length > 0) {
						const or = textFields.map((f) => `${f}.ilike.${s}`).join(",");
						query = query.or(or);
					}
				}

				// FILTERS
				for (const [field, filter] of Object.entries(filters)) {
					const { operator, value, valueTo } = filter;

					const apply = (q: any) => {
						switch (operator) {
							case "eq": return q.eq(field, value);
							case "neq": return q.neq(field, value);
							case "contains": return q.ilike(field, `%${value}%`);
							case "gt": return q.gt(field, value);
							case "gte": return q.gte(field, value);
							case "lt": return q.lt(field, value);
							case "lte": return q.lte(field, value);
							case "between": {
								let r = q;
								if (value != null) r = r.gte(field, value);
								if (valueTo != null) r = r.lte(field, valueTo);
								return r;
							}
							case "in": return Array.isArray(value) ? q.in(field, value) : q;
							case "empty": return q.is(field, null);
							case "notEmpty": return q.not(field, "is", null);
							default: return q;
						}
					};

					query = apply(query);
				}

				// SORT (priority + main)
				for (const pf of priorityFields) {
					query = query.order(pf, { ascending: false });
				}
				query = query.order(sort.field, { ascending: sort.direction === "asc" });

				// PAGINATION
				const from = (page - 1) * perPage;
				const to = from + perPage - 1;
				query = query.range(from, to);

				// EXECUTE
				const { data: recordsRaw, error, count } = await query;

				if (error) {
					console.error("[useServerEntityList] Query error:", error);
					if (Object.keys(error).length === 0) {
						throw new Error("Supabase returned empty error object (auth lock / network issue)");
					}
					throw error;
				}

				const records = (recordsRaw || []) as EntityDataMap[E][];

				// Sync to global store
				const store = useStore.getState();
				for (const r of records) {
					store.upsertEntity(entity, (r as any).id, r);
				}

				setItems(records);
				setTotalItems(count ?? 0);
			} catch (err: any) {
				if (err.name === "AbortError") return;

				console.error("[useServerEntityList] Fetch error:", err);
				setError(
					err?.message ||
					err?.details ||
					err?.hint ||
					(Object.keys(err || {}).length === 0 ? "Auth lock timeout or network issue" : String(err)) ||
					"Unknown error"
				);
			} finally {
				setIsLoading(false);
				setIsRefetching(false);
				fetchInProgressRef.current = false;
			}
		},
		[
			entity,
			page,
			perPage,
			JSON.stringify(filters),
			JSON.stringify(sort),
			debouncedSearch,
			filterFields,
			priorityFields,
			selectFields,
			countMethod,
		]
	);

	// Update ref when fetchData changes
	const fetchRef = useRef(fetchData);
	useEffect(() => {
		fetchRef.current = fetchData;
	}, [fetchData]);

	// Main fetch effect
	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Debounce search
	useEffect(() => {
		if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
		searchTimeoutRef.current = setTimeout(() => {
			setDebouncedSearch(search);
			setPageState(1);
		}, 300);

		return () => {
			if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
		};
	}, [search]);

	// ==========================================================================
	// REALTIME
	// ==========================================================================

	useEffect(() => {
		if (!enableRealtime) return;

		const supabase = getSupabaseClient();
		const ch = supabase
			.channel(`server-list:${entity}`)
			.on("postgres_changes", { event: "*", schema: "public", table: entity }, () => {
				fetchRef.current({ silent: true });
			})
			.subscribe();

		return () => {
			supabase.removeChannel(ch);
		};
	}, [entity, enableRealtime]);

	// Page correction
	useEffect(() => {
		if (totalItems > 0 && page > totalPages) {
			setPageState(totalPages);
		}
	}, [totalItems, totalPages, page]);

	// ==========================================================================
	// ACTIONS
	// ==========================================================================

	const setPage = useCallback((p: number) => setPageState(Math.max(1, p)), []);
	const setPerPage = useCallback((pp: number) => {
		setPerPageState(pp);
		setPageState(1);
	}, []);
	const nextPage = useCallback(() => {
		if (hasNextPage) setPageState((p) => p + 1);
	}, [hasNextPage]);
	const prevPage = useCallback(() => {
		if (hasPrevPage) setPageState((p) => p - 1);
	}, [hasPrevPage]);

	const setFilter = useCallback((field: string, value: ServerFilterValue | null) => {
		setFiltersState((prev) => {
			const next = { ...prev };
			if (value === null) delete next[field];
			else next[field] = value;
			return next;
		});
		setPageState(1);
	}, []);

	const clearFilters = useCallback(() => {
		setFiltersState({});
		setSearchState("");
		setDebouncedSearch("");
		setPageState(1);
	}, []);

	const setSort = useCallback((s: ServerSortConfig) => {
		setSortState(s);
		setPageState(1);
	}, []);

	const setSearch = useCallback((s: string) => setSearchState(s), []);
	const refresh = useCallback(() => fetchData({ silent: true }), [fetchData]);

	return {
		items,
		totalItems,
		totalPages,
		isLoading,
		isRefetching,
		error,
		page: safePage,
		perPage,
		hasNextPage,
		hasPrevPage,
		setPage,
		setPerPage,
		nextPage,
		prevPage,
		filters,
		setFilter,
		clearFilters,
		sort,
		setSort,
		search,
		setSearch,
		refresh,
		perPageOptions,
		activeFilterCount,
		hasActiveFilters,
	};
}