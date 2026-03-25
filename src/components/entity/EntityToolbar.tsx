"use client";

/**
 * EntityToolbar — универсальная панель фильтрации и сортировки
 *
 * USAGE:
 * ```tsx
 * const filters = useEntityFilters({
 *   filterFields: [
 *     { field: "title", label: "Title", type: "text" },
 *     { field: "status", label: "Status", type: "select", options: statusOptions },
 *     { field: "priority", label: "Priority", type: "number" },
 *     { field: "created_at", label: "Created", type: "date" },
 *   ],
 *   sortFields: [
 *     { field: "created_at", label: "Date Created" },
 *     { field: "title", label: "Title" },
 *     { field: "status", label: "Status" },
 *   ],
 * });
 *
 * <EntityToolbar {...filters} />
 * ```
 */

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Search,
	X,
	SlidersHorizontal,
} from "lucide-react";
import type {
	FilterFieldConfig,
	FilterValue,
	SortConfig,
	UseEntityFiltersReturn,
} from "@/hooks/useEntityFilters";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EntityToolbarProps
	extends Pick<
		UseEntityFiltersReturn,
		| "filters"
		| "sort"
		| "search"
		| "setFilter"
		| "setSort"
		| "setSearch"
		| "clearFilters"
		| "clearAll"
		| "activeFilterCount"
		| "hasActiveFilters"
		| "filterFields"
		| "sortFields"
	> {
	/** Placeholder для поиска */
	searchPlaceholder?: string;

	/** Показывать поиск? @default true */
	showSearch?: boolean;

	/** Показывать сортировку? @default true */
	showSort?: boolean;

	/** Показывать фильтры? @default true */
	showFilters?: boolean;

	className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EntityToolbar({
	filters,
	sort,
	search,
	setFilter,
	setSort,
	setSearch,
	clearFilters,
	clearAll,
	activeFilterCount,
	hasActiveFilters,
	filterFields,
	sortFields,
	searchPlaceholder = "Search...",
	showSearch = true,
	showSort = true,
	showFilters = true,
	className,
}: EntityToolbarProps) {
	// ==========================================================================
	// SORT TOGGLE
	// ==========================================================================

	const toggleSortDirection = useCallback(() => {
		setSort({
			...sort,
			direction: sort.direction === "asc" ? "desc" : "asc",
		});
	}, [sort, setSort]);

	// ==========================================================================
	// RENDER
	// ==========================================================================

	return (
		<div className={cn("space-y-3", className)}>
			{/* Row 1: Search + Sort */}
			<div className="flex items-center gap-2">
				{/* Search */}
				{showSearch && (
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={searchPlaceholder}
							className="pl-9 h-9"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						)}
					</div>
				)}

				{/* Sort */}
				{showSort && sortFields.length > 0 && (
					<div className="flex items-center gap-1">
						<Select
							value={sort.field}
							onValueChange={(field) =>
								setSort({ ...sort, field })
							}
						>
							<SelectTrigger className="h-9 w-[160px] text-xs">
								<ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{sortFields.map((sf) => (
									<SelectItem key={sf.field} value={sf.field}>
										{sf.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9"
							onClick={toggleSortDirection}
						>
							{sort.direction === "asc" ? (
								<ArrowUp className="h-4 w-4" />
							) : (
								<ArrowDown className="h-4 w-4" />
							)}
						</Button>
					</div>
				)}

				{/* Clear all */}
				{hasActiveFilters && (
					<Button
						variant="ghost"
						size="sm"
						onClick={clearAll}
						className="h-9 text-xs text-muted-foreground"
					>
						<X className="h-3.5 w-3.5 mr-1" />
						Clear ({activeFilterCount})
					</Button>
				)}
			</div>

			{/* Row 2: Filter chips */}
			{showFilters && filterFields.length > 0 && (
				<div className="flex flex-wrap items-center gap-2">
					<SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />

					{filterFields.map((fieldConfig) => (
						<FilterChip
							key={fieldConfig.field}
							config={fieldConfig}
							value={filters[fieldConfig.field] || null}
							onChange={(val) =>
								setFilter(fieldConfig.field, val)
							}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ============================================================================
// FILTER CHIP — рендерит нужный UI по типу поля
// ============================================================================

interface FilterChipProps {
	config: FilterFieldConfig;
	value: FilterValue | null;
	onChange: (value: FilterValue | null) => void;
}

function FilterChip({ config, value, onChange }: FilterChipProps) {
	const isActive = value !== null;

	// ==========================================================================
	// SELECT TYPE
	// ==========================================================================

	if (config.type === "select" && config.options) {
		return (
			<div className="flex items-center gap-1">
				<Select
					value={value?.value ?? "__all__"}
					onValueChange={(val) => {
						if (val === "__all__") {
							onChange(null);
						} else {
							onChange({ operator: "eq", value: val });
						}
					}}
				>
					<SelectTrigger
						className={cn(
							"h-8 text-xs min-w-[120px]",
							isActive && "border-primary bg-primary/5",
						)}
					>
						<SelectValue placeholder={config.label} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__all__">
							All {config.label}
						</SelectItem>
						{config.options.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		);
	}

	// ==========================================================================
	// TEXT TYPE — inline search
	// ==========================================================================

	if (config.type === "text") {
		return (
			<div className="relative">
				<Input
					value={value?.value ?? ""}
					onChange={(e) => {
						const val = e.target.value;
						if (!val) {
							onChange(null);
						} else {
							onChange({ operator: "contains", value: val });
						}
					}}
					placeholder={config.placeholder || config.label}
					className={cn(
						"h-8 text-xs w-[150px]",
						isActive && "border-primary bg-primary/5",
					)}
				/>
				{isActive && (
					<button
						onClick={() => onChange(null)}
						className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						<X className="h-3 w-3" />
					</button>
				)}
			</div>
		);
	}

	// ==========================================================================
	// NUMBER TYPE — min/max inputs
	// ==========================================================================

	if (config.type === "number") {
		return (
			<div className="flex items-center gap-1">
				<span className="text-xs text-muted-foreground">
					{config.label}:
				</span>
				<Input
					type="number"
					value={value?.value ?? ""}
					onChange={(e) => {
						const num = e.target.value
							? Number(e.target.value)
							: null;
						if (num === null) {
							onChange(null);
						} else {
							onChange({
								operator:
									value?.valueTo != null ? "between" : "gte",
								value: num,
								valueTo: value?.valueTo,
							});
						}
					}}
					placeholder="Min"
					className={cn(
						"h-8 text-xs w-[80px]",
						isActive && "border-primary bg-primary/5",
					)}
				/>
				<span className="text-xs text-muted-foreground">—</span>
				<Input
					type="number"
					value={value?.valueTo ?? ""}
					onChange={(e) => {
						const num = e.target.value
							? Number(e.target.value)
							: undefined;
						const minVal = value?.value;
						if (!minVal && !num) {
							onChange(null);
						} else {
							onChange({
								operator: "between",
								value: minVal ?? 0,
								valueTo: num,
							});
						}
					}}
					placeholder="Max"
					className={cn(
						"h-8 text-xs w-[80px]",
						isActive && "border-primary bg-primary/5",
					)}
				/>
				{isActive && (
					<button
						onClick={() => onChange(null)}
						className="text-muted-foreground hover:text-foreground"
					>
						<X className="h-3 w-3" />
					</button>
				)}
			</div>
		);
	}

	// ==========================================================================
	// BOOLEAN TYPE
	// ==========================================================================

	if (config.type === "boolean") {
		return (
			<Select
				value={
					value === null
						? "__all__"
						: value.value
							? "__true__"
							: "__false__"
				}
				onValueChange={(val) => {
					if (val === "__all__") {
						onChange(null);
					} else {
						onChange({
							operator: "eq",
							value: val === "__true__",
						});
					}
				}}
			>
				<SelectTrigger
					className={cn(
						"h-8 text-xs min-w-[100px]",
						isActive && "border-primary bg-primary/5",
					)}
				>
					<SelectValue placeholder={config.label} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="__all__">All</SelectItem>
					<SelectItem value="__true__">Yes</SelectItem>
					<SelectItem value="__false__">No</SelectItem>
				</SelectContent>
			</Select>
		);
	}

	// ==========================================================================
	// DATE TYPE — simple date inputs
	// ==========================================================================

	if (config.type === "date") {
		return (
			<div className="flex items-center gap-1">
				<span className="text-xs text-muted-foreground">
					{config.label}:
				</span>
				<Input
					type="date"
					value={value?.value ?? ""}
					onChange={(e) => {
						const val = e.target.value || null;
						if (!val) {
							onChange(null);
						} else {
							onChange({
								operator: value?.valueTo ? "between" : "gte",
								value: val,
								valueTo: value?.valueTo,
							});
						}
					}}
					className={cn(
						"h-8 text-xs w-[140px]",
						isActive && "border-primary bg-primary/5",
					)}
				/>
				<span className="text-xs text-muted-foreground">—</span>
				<Input
					type="date"
					value={value?.valueTo ?? ""}
					onChange={(e) => {
						const val = e.target.value || undefined;
						if (!value?.value && !val) {
							onChange(null);
						} else {
							onChange({
								operator: "between",
								value: value?.value ?? "",
								valueTo: val,
							});
						}
					}}
					className={cn(
						"h-8 text-xs w-[140px]",
						isActive && "border-primary bg-primary/5",
					)}
				/>
				{isActive && (
					<button
						onClick={() => onChange(null)}
						className="text-muted-foreground hover:text-foreground"
					>
						<X className="h-3 w-3" />
					</button>
				)}
			</div>
		);
	}

	return null;
}
