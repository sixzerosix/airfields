"use client";

/**
 * ServerEntityToolbar — панель фильтрации для серверной пагинации
 *
 * Работает с useServerEntityList.
 * Тот же UI что EntityToolbar, но берёт state из server hook.
 *
 * USAGE:
 * ```tsx
 * const serverList = useServerEntityList("notes", { ... });
 * <ServerEntityToolbar {...serverList} sortFields={[...]} filterConfigs={[...]} />
 * ```
 */

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
	Loader2,
} from "lucide-react";
import type {
	ServerFilterValue,
	ServerSortConfig,
	UseServerEntityListReturn,
} from "@/hooks/useServerEntityList";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface FilterConfig {
	field: string;
	label: string;
	type: "text" | "number" | "select" | "date" | "boolean";
	options?: { value: string; label: string }[];
	placeholder?: string;
}

interface ServerEntityToolbarProps {
	// From useServerEntityList
	filters: Record<string, ServerFilterValue>;
	sort: ServerSortConfig;
	search: string;
	setFilter: (field: string, value: ServerFilterValue | null) => void;
	setSort: (sort: ServerSortConfig) => void;
	setSearch: (search: string) => void;
	clearFilters: () => void;
	isRefetching?: boolean;

	// Config
	sortFields: { field: string; label: string }[];
	filterConfigs: FilterConfig[];
	searchPlaceholder?: string;
	showSearch?: boolean;
	showSort?: boolean;
	showFilters?: boolean;
	className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ServerEntityToolbar({
	filters,
	sort,
	search,
	setFilter,
	setSort,
	setSearch,
	clearFilters,
	isRefetching,
	sortFields,
	filterConfigs,
	searchPlaceholder = "Search...",
	showSearch = true,
	showSort = true,
	showFilters = true,
	className,
}: ServerEntityToolbarProps) {
	const toggleDir = useCallback(() => {
		setSort({
			...sort,
			direction: sort.direction === "asc" ? "desc" : "asc",
		});
	}, [sort, setSort]);

	const hasActive = Object.keys(filters).length > 0 || search.length > 0;

	return (
		<div className={cn("space-y-3", className)}>
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
							onClick={toggleDir}
						>
							{sort.direction === "asc" ? (
								<ArrowUp className="h-4 w-4" />
							) : (
								<ArrowDown className="h-4 w-4" />
							)}
						</Button>
					</div>
				)}

				{/* Refetching indicator */}
				{isRefetching && (
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				)}

				{/* Clear */}
				{hasActive && (
					<Button
						variant="ghost"
						size="sm"
						onClick={clearFilters}
						className="h-9 text-xs text-muted-foreground"
					>
						<X className="h-3.5 w-3.5 mr-1" />
						Clear
					</Button>
				)}
			</div>

			{/* Filter chips */}
			{showFilters && filterConfigs.length > 0 && (
				<div className="flex flex-wrap items-center gap-2">
					<SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
					{filterConfigs.map((fc) => (
						<FilterChip
							key={fc.field}
							config={fc}
							value={filters[fc.field] || null}
							onChange={(v) => setFilter(fc.field, v)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ============================================================================
// FILTER CHIP
// ============================================================================

function FilterChip({
	config,
	value,
	onChange,
}: {
	config: FilterConfig;
	value: ServerFilterValue | null;
	onChange: (v: ServerFilterValue | null) => void;
}) {
	const isActive = value !== null;

	if (config.type === "select" && config.options) {
		return (
			<Select
				value={value?.value ?? "__all__"}
				onValueChange={(v) => {
					onChange(
						v === "__all__" ? null : { operator: "eq", value: v },
					);
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
					<SelectItem value="__all__">All {config.label}</SelectItem>
					{config.options.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	if (config.type === "text") {
		return (
			<div className="relative">
				<Input
					value={value?.value ?? ""}
					onChange={(e) => {
						onChange(
							e.target.value
								? {
										operator: "contains",
										value: e.target.value,
									}
								: null,
						);
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
				onValueChange={(v) => {
					onChange(
						v === "__all__"
							? null
							: { operator: "eq", value: v === "__true__" },
					);
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

	return null;
}
