"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";

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
// PARSE FILTERS FROM URL
// ============================================================================

function parseFiltersFromUrl(
	filterFields: FilterFieldConfig[],
): Record<string, FilterValue> {
	if (typeof window === "undefined") return {};

	const params = new URLSearchParams(window.location.search);
	const result: Record<string, FilterValue> = {};

	for (const { field, type } of filterFields) {
		if (type === "number") {
			const min = params.get(`${field}_min`);
			const max = params.get(`${field}_max`);
			if (min || max) {
				result[field] = {
					operator: min && max ? "between" : min ? "gte" : "lte",
					value: min ? Number(min) : undefined,
					valueTo: max ? Number(max) : undefined,
				};
			}
		} else if (type === "date") {
			const from = params.get(`${field}_from`);
			const to = params.get(`${field}_to`);
			if (from || to) {
				result[field] = {
					operator: from && to ? "between" : from ? "gte" : "lte",
					value: from || undefined,
					valueTo: to || undefined,
				};
			}
		} else {
			const val = params.get(field);
			if (val !== null && val !== "") {
				if (type === "boolean") {
					result[field] = { operator: "eq", value: val === "true" };
				} else if (type === "select") {
					result[field] = { operator: "eq", value: val };
				} else {
					result[field] = { operator: "contains", value: val };
				}
			}
		}
	}

	return result;
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
	// URL STATE — search & sort (nuqs)
	// ==========================================================================

	const [search, setSearchRaw] = useQueryState(
		"q",
		parseAsString.withDefault("").withOptions({ shallow: true }),
	);

	const [sortField, setSortField] = useQueryState(
		"sort",
		parseAsString.withDefault(defaultSort.field).withOptions({ shallow: true }),
	);

	const [sortDir, setSortDir] = useQueryState(
		"dir",
		parseAsStringEnum(["asc", "desc"] as const)
			.withDefault(defaultSort.direction)
			.withOptions({ shallow: true }),
	);

	// ==========================================================================
	// FILTERS STATE — парсится из URL один раз при mount
	// ==========================================================================

	const [filters, setFiltersState] = useState<Record<string, FilterValue>>({});

	// ✅ Один useEffect, один раз при mount — без version хака
	useEffect(() => {
		setFiltersState(parseFiltersFromUrl(filterFields));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ==========================================================================
	// UPDATE URL for filters
	// ==========================================================================

	const updateFilterInUrl = useCallback(
		(field: string, value: FilterValue | null, fieldConfig: FilterFieldConfig) => {
			const url = new URL(window.location.href);

			url.searchParams.delete(field);
			url.searchParams.delete(`${field}_min`);
			url.searchParams.delete(`${field}_max`);
			url.searchParams.delete(`${field}_from`);
			url.searchParams.delete(`${field}_to`);

			if (value !== null) {
				if (fieldConfig.type === "number") {
					if (value.value != null) url.searchParams.set(`${field}_min`, String(value.value));
					if (value.valueTo != null) url.searchParams.set(`${field}_max`, String(value.valueTo));
				} else if (fieldConfig.type === "date") {
					if (value.value) url.searchParams.set(`${field}_from`, value.value);
					if (value.valueTo) url.searchParams.set(`${field}_to`, value.valueTo);
				} else {
					const str = String(value.value ?? "");
					if (str) url.searchParams.set(field, str);
				}
			}

			window.history.replaceState({}, "", url.toString());
		},
		[],
	);

	// ==========================================================================
	// ACTIONS — ✅ никаких setSearchRaw((prev) => prev) хаков
	// ==========================================================================

	const setSearch = useCallback(
		(value: string) => setSearchRaw(value || null),
		[setSearchRaw],
	);

	const setSort = useCallback(
		(s: SortConfig) => {
			setSortField(s.field);
			setSortDir(s.direction);
		},
		[setSortField, setSortDir],
	);

	// ✅ setFilter обновляет URL + state напрямую. Без хаков.
	const setFilter = useCallback(
		(field: string, value: FilterValue | null) => {
			const fc = filterFields.find((f) => f.field === field);
			if (!fc) return;

			updateFilterInUrl(field, value, fc);

			setFiltersState((prev) => {
				const next = { ...prev };
				if (value === null) {
					delete next[field];
				} else {
					next[field] = value;
				}
				return next;
			});
		},
		[filterFields, updateFilterInUrl],
	);

	// ✅ clearFilters — URL cleanup + setState. Без хаков.
	const clearFilters = useCallback(() => {
		const url = new URL(window.location.href);
		for (const { field } of filterFields) {
			url.searchParams.delete(field);
			url.searchParams.delete(`${field}_min`);
			url.searchParams.delete(`${field}_max`);
			url.searchParams.delete(`${field}_from`);
			url.searchParams.delete(`${field}_to`);
		}
		window.history.replaceState({}, "", url.toString());
		setFiltersState({});
	}, [filterFields]);

	// ✅ clearAll — nuqs для search/sort + clearFilters для остального
	const clearAll = useCallback(() => {
		setSearchRaw(null);
		setSortField(null);
		setSortDir(null);
		clearFilters();
	}, [setSearchRaw, setSortField, setSortDir, clearFilters]);

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

			for (const [field, filter] of Object.entries(filters)) {
				result = result.filter((item) => matchFilter(item[field], filter));
			}

			result.sort((a, b) => {
				const aV = a[sortField], bV = b[sortField];
				if (aV == null && bV == null) return 0;
				if (aV == null) return sortDir === "desc" ? 1 : -1;
				if (bV == null) return sortDir === "desc" ? -1 : 1;
				const cmp = aV < bV ? -1 : aV > bV ? 1 : 0;
				return sortDir === "desc" ? -cmp : cmp;
			});

			return result;
		},
		[filters, sortField, sortDir, search, filterFields],
	);

	const enrichedFilterFields = useMemo(
		() => filterFields.map((f) => ({ ...f, operators: f.operators || defaultOperatorsByType[f.type] })),
		[filterFields],
	);

	return {
		filters,
		sort: { field: sortField, direction: sortDir },
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