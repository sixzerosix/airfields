"use client";

import { useState, useCallback, useMemo, useEffect } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type FilterOperator =
	| "eq" | "neq" | "contains"
	| "gt" | "gte" | "lt" | "lte" | "between"
	| "in" | "empty" | "notEmpty";

export interface FilterValue {
	operator: FilterOperator;
	value: any;
	valueTo?: any;
}

export interface SortConfig {
	field: string;
	direction: "asc" | "desc";
}

export interface FilterFieldConfig {
	field: string;
	label: string;
	type: "text" | "number" | "select" | "date" | "boolean";
	options?: { value: string; label: string }[];
	placeholder?: string;
	operators?: FilterOperator[];
}

export interface UseEntityFiltersConfig {
	filterFields?: FilterFieldConfig[];
	sortFields?: { field: string; label: string }[];
	defaultSort?: SortConfig;
}

export interface UseEntityFiltersReturn {
	filters: Record<string, FilterValue>;
	sort: SortConfig;
	search: string;
	setFilter: (field: string, value: FilterValue | null) => void;
	setSort: (sort: SortConfig) => void;
	setSearch: (search: string) => void;
	clearFilters: () => void;
	clearAll: () => void;
	applyTo: <T extends Record<string, any>>(items: T[]) => T[];
	activeFilterCount: number;
	hasActiveFilters: boolean;
	filterFields: FilterFieldConfig[];
	sortFields: { field: string; label: string }[];
}

const defaultOperatorsByType: Record<FilterFieldConfig["type"], FilterOperator[]> = {
	text: ["contains", "eq", "neq", "empty", "notEmpty"],
	number: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
	select: ["eq", "neq", "in"],
	date: ["eq", "gt", "lt", "between"],
	boolean: ["eq"],
};

// ============================================================================
// URL HELPERS
// ============================================================================

function readFromUrl(
	filterFields: FilterFieldConfig[],
	defaultSort: SortConfig,
): {
	search: string;
	sort: SortConfig;
	filters: Record<string, FilterValue>;
} {
	if (typeof window === "undefined") {
		return { search: "", sort: defaultSort, filters: {} };
	}

	const params = new URLSearchParams(window.location.search);

	// Search
	const search = params.get("q") || "";

	// Sort
	const sortField = params.get("sort") || defaultSort.field;
	const sortDir = params.get("dir");
	const direction: "asc" | "desc" =
		sortDir === "asc" ? "asc" : sortDir === "desc" ? "desc" : defaultSort.direction;
	const sort: SortConfig = { field: sortField, direction };

	// Filters
	const filters: Record<string, FilterValue> = {};

	for (const { field, type } of filterFields) {
		if (type === "number") {
			const min = params.get(`${field}_min`);
			const max = params.get(`${field}_max`);
			if (min || max) {
				filters[field] = {
					operator: min && max ? "between" : min ? "gte" : "lte",
					value: min ? Number(min) : undefined,
					valueTo: max ? Number(max) : undefined,
				};
			}
		} else if (type === "date") {
			const from = params.get(`${field}_from`);
			const to = params.get(`${field}_to`);
			if (from || to) {
				filters[field] = {
					operator: from && to ? "between" : from ? "gte" : "lte",
					value: from || undefined,
					valueTo: to || undefined,
				};
			}
		} else {
			const val = params.get(field);
			if (val !== null && val !== "") {
				if (type === "boolean") {
					filters[field] = { operator: "eq", value: val === "true" };
				} else if (type === "select") {
					filters[field] = { operator: "eq", value: val };
				} else {
					filters[field] = { operator: "contains", value: val };
				}
			}
		}
	}

	return { search, sort, filters };
}

function writeToUrl(
	search: string,
	sort: SortConfig,
	filters: Record<string, FilterValue>,
	filterFields: FilterFieldConfig[],
	defaultSort: SortConfig,
) {
	if (typeof window === "undefined") return;

	const url = new URL(window.location.href);

	// Search
	if (search) {
		url.searchParams.set("q", search);
	} else {
		url.searchParams.delete("q");
	}

	// Sort — only write if different from default
	if (sort.field !== defaultSort.field) {
		url.searchParams.set("sort", sort.field);
	} else {
		url.searchParams.delete("sort");
	}

	if (sort.direction !== defaultSort.direction) {
		url.searchParams.set("dir", sort.direction);
	} else {
		url.searchParams.delete("dir");
	}

	// Filters — clean all first, then set active
	for (const { field } of filterFields) {
		url.searchParams.delete(field);
		url.searchParams.delete(`${field}_min`);
		url.searchParams.delete(`${field}_max`);
		url.searchParams.delete(`${field}_from`);
		url.searchParams.delete(`${field}_to`);
	}

	for (const [field, filter] of Object.entries(filters)) {
		const fc = filterFields.find((f) => f.field === field);
		if (!fc) continue;

		if (fc.type === "number") {
			if (filter.value != null) url.searchParams.set(`${field}_min`, String(filter.value));
			if (filter.valueTo != null) url.searchParams.set(`${field}_max`, String(filter.valueTo));
		} else if (fc.type === "date") {
			if (filter.value) url.searchParams.set(`${field}_from`, filter.value);
			if (filter.valueTo) url.searchParams.set(`${field}_to`, filter.valueTo);
		} else {
			const str = String(filter.value ?? "");
			if (str) url.searchParams.set(field, str);
		}
	}

	window.history.replaceState({}, "", url.toString());
}

// ============================================================================
// HOOK
// ============================================================================

export function useEntityFilters(
	config: UseEntityFiltersConfig = {},
): UseEntityFiltersReturn {
	const {
		filterFields = [],
		sortFields = [],
		defaultSort = { field: "created_at", direction: "desc" },
	} = config;

	// ==========================================================================
	// STATE — всё через useState, НОЛЬ nuqs
	// ==========================================================================

	const [search, setSearchState] = useState("");
	const [sort, setSortState] = useState<SortConfig>(defaultSort);
	const [filters, setFiltersState] = useState<Record<string, FilterValue>>({});
	const [initialized, setInitialized] = useState(false);

	// ==========================================================================
	// INIT FROM URL (один раз при mount)
	// ==========================================================================

	useEffect(() => {
		const fromUrl = readFromUrl(filterFields, defaultSort);
		setSearchState(fromUrl.search);
		setSortState(fromUrl.sort);
		setFiltersState(fromUrl.filters);
		setInitialized(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ==========================================================================
	// ACTIONS — обновляют state + URL
	// ==========================================================================

	const setSearch = useCallback(
		(value: string) => {
			setSearchState(value);
			// Defer URL update to avoid interrupting typing
			setTimeout(() => {
				const url = new URL(window.location.href);
				if (value) {
					url.searchParams.set("q", value);
				} else {
					url.searchParams.delete("q");
				}
				window.history.replaceState({}, "", url.toString());
			}, 0);
		},
		[],
	);

	const setSort = useCallback(
		(newSort: SortConfig) => {
			setSortState(newSort);
			const url = new URL(window.location.href);

			if (newSort.field !== defaultSort.field) {
				url.searchParams.set("sort", newSort.field);
			} else {
				url.searchParams.delete("sort");
			}

			if (newSort.direction !== defaultSort.direction) {
				url.searchParams.set("dir", newSort.direction);
			} else {
				url.searchParams.delete("dir");
			}

			window.history.replaceState({}, "", url.toString());
		},
		[defaultSort],
	);

	const setFilter = useCallback(
		(field: string, value: FilterValue | null) => {
			const fc = filterFields.find((f) => f.field === field);
			if (!fc) return;

			setFiltersState((prev) => {
				const next = { ...prev };
				if (value === null) {
					delete next[field];
				} else {
					next[field] = value;
				}

				// Update URL for this filter
				const url = new URL(window.location.href);
				url.searchParams.delete(field);
				url.searchParams.delete(`${field}_min`);
				url.searchParams.delete(`${field}_max`);
				url.searchParams.delete(`${field}_from`);
				url.searchParams.delete(`${field}_to`);

				if (value !== null) {
					if (fc.type === "number") {
						if (value.value != null) url.searchParams.set(`${field}_min`, String(value.value));
						if (value.valueTo != null) url.searchParams.set(`${field}_max`, String(value.valueTo));
					} else if (fc.type === "date") {
						if (value.value) url.searchParams.set(`${field}_from`, value.value);
						if (value.valueTo) url.searchParams.set(`${field}_to`, value.valueTo);
					} else {
						const str = String(value.value ?? "");
						if (str) url.searchParams.set(field, str);
					}
				}

				window.history.replaceState({}, "", url.toString());
				return next;
			});
		},
		[filterFields],
	);

	const clearFilters = useCallback(() => {
		setFiltersState({});

		const url = new URL(window.location.href);
		for (const { field } of filterFields) {
			url.searchParams.delete(field);
			url.searchParams.delete(`${field}_min`);
			url.searchParams.delete(`${field}_max`);
			url.searchParams.delete(`${field}_from`);
			url.searchParams.delete(`${field}_to`);
		}
		window.history.replaceState({}, "", url.toString());
	}, [filterFields]);

	const clearAll = useCallback(() => {
		setSearchState("");
		setSortState(defaultSort);
		setFiltersState({});

		// Clean URL completely
		const url = new URL(window.location.href);
		url.searchParams.delete("q");
		url.searchParams.delete("sort");
		url.searchParams.delete("dir");
		for (const { field } of filterFields) {
			url.searchParams.delete(field);
			url.searchParams.delete(`${field}_min`);
			url.searchParams.delete(`${field}_max`);
			url.searchParams.delete(`${field}_from`);
			url.searchParams.delete(`${field}_to`);
		}
		window.history.replaceState({}, "", url.toString());
	}, [filterFields, defaultSort]);

	// ==========================================================================
	// COMPUTED
	// ==========================================================================

	const activeFilterCount = Object.keys(filters).length + (search ? 1 : 0);
	const hasActiveFilters = activeFilterCount > 0;

	// ==========================================================================
	// APPLY TO DATA
	// ==========================================================================

	const applyTo = useCallback(
		<T extends Record<string, any>>(items: T[]): T[] => {
			let result = [...items];

			// Search
			if (search.trim()) {
				const s = search.toLowerCase().trim();
				const textFields = filterFields.filter((f) => f.type === "text").map((f) => f.field);

				result = result.filter((item) => {
					if (textFields.length > 0) {
						return textFields.some((f) => String(item[f] || "").toLowerCase().includes(s));
					}
					return Object.values(item).some((v) => typeof v === "string" && v.toLowerCase().includes(s));
				});
			}

			// Filters
			for (const [field, filter] of Object.entries(filters)) {
				result = result.filter((item) => matchFilter(item[field], filter));
			}

			// Sort
			result.sort((a, b) => {
				const aV = a[sort.field];
				const bV = b[sort.field];
				if (aV == null && bV == null) return 0;
				if (aV == null) return sort.direction === "desc" ? 1 : -1;
				if (bV == null) return sort.direction === "desc" ? -1 : 1;
				const cmp = aV < bV ? -1 : aV > bV ? 1 : 0;
				return sort.direction === "desc" ? -cmp : cmp;
			});

			return result;
		},
		[filters, sort.field, sort.direction, search, filterFields],
	);

	// Enrich filterFields
	const enrichedFilterFields = useMemo(
		() => filterFields.map((f) => ({ ...f, operators: f.operators || defaultOperatorsByType[f.type] })),
		[filterFields],
	);

	return {
		filters,
		sort,
		search,
		setFilter,
		setSort,
		setSearch,
		clearFilters,
		clearAll,
		applyTo,
		activeFilterCount,
		hasActiveFilters,
		filterFields: enrichedFilterFields,
		sortFields,
	};
}

// ============================================================================
// FILTER MATCHING
// ============================================================================

function matchFilter(fieldValue: any, filter: FilterValue): boolean {
	const { operator, value, valueTo } = filter;
	switch (operator) {
		case "eq": return fieldValue === value;
		case "neq": return fieldValue !== value;
		case "contains": return String(fieldValue || "").toLowerCase().includes(String(value || "").toLowerCase());
		case "gt": return fieldValue > value;
		case "gte": return fieldValue >= value;
		case "lt": return fieldValue < value;
		case "lte": return fieldValue <= value;
		case "between":
			if (value != null && valueTo != null) return fieldValue >= value && fieldValue <= valueTo;
			if (value != null) return fieldValue >= value;
			if (valueTo != null) return fieldValue <= valueTo;
			return true;
		case "in": return Array.isArray(value) && value.includes(fieldValue);
		case "empty": return fieldValue === null || fieldValue === undefined || fieldValue === "";
		case "notEmpty": return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
		default: return true;
	}
}