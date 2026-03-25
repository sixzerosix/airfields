"use client";

/**
 * EntityPagination — универсальный UI пагинации
 *
 * 3 режима:
 * 1. pages     — классическая: [< 1 2 3 ... 24 >] + Rows per page
 * 2. loadMore  — кнопка "Show more"
 * 3. infinite  — авто-загрузка при скролле (sentinel div)
 *
 * Все части включаются/выключаются:
 * - showPageNumbers  — номера страниц
 * - showArrows       — стрелки вперёд/назад
 * - showPerPage      — "Rows per page" selector
 * - showInfo         — "1-25 of 100"
 * - showFirstLast    — первая/последняя страница
 *
 * USAGE:
 * ```tsx
 * const pagination = useEntityPagination({ mode: "pages", defaultPerPage: 25 });
 * const filtered = filters.applyTo(rawItems);
 * const paginated = pagination.paginate(filtered);
 *
 * <EntityList items={paginated} ...>
 *   {(item) => ...}
 * </EntityList>
 *
 * <EntityPagination {...pagination} />
 * ```
 */

import { useMemo } from "react";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { UseEntityPaginationReturn } from "@/hooks/useEntityPagination";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EntityPaginationProps extends UseEntityPaginationReturn {
	/** Показывать номера страниц @default true */
	showPageNumbers?: boolean;

	/** Показывать стрелки ←→ @default true */
	showArrows?: boolean;

	/** Показывать "Rows per page" @default true */
	showPerPage?: boolean;

	/** Показывать "1-25 of 100" @default true */
	showInfo?: boolean;

	/** Показывать первую/последнюю страницу @default true */
	showFirstLast?: boolean;

	/** Макс. видимых номеров страниц @default 5 */
	maxVisiblePages?: number;

	/** Текст кнопки "Load more" @default "Show more" */
	loadMoreText?: string;

	/** Показывать спиннер при загрузке (для loadMore/infinite) */
	isLoading?: boolean;

	/** Label для "Rows per page" */
	perPageLabel?: string;

	className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EntityPagination({
	mode,
	page,
	perPage,
	totalItems,
	totalPages,
	startIndex,
	endIndex,
	hasNextPage,
	hasPrevPage,
	setPage,
	setPerPage,
	nextPage,
	prevPage,
	goToFirst,
	goToLast,
	loadMore,
	perPageOptions,
	sentinelRef,
	showPageNumbers = true,
	showArrows = true,
	showPerPage = true,
	showInfo = true,
	showFirstLast = true,
	maxVisiblePages = 5,
	loadMoreText = "Show more",
	isLoading = false,
	perPageLabel = "Rows per page",
	className,
}: EntityPaginationProps) {
	// ==========================================================================
	// MODE: PAGES
	// ==========================================================================

	if (mode === "pages") {
		return (
			<div
				className={cn(
					"flex flex-col sm:flex-row items-center justify-between gap-4 pt-4",
					className,
				)}
			>
				{/* Left: Per page selector */}
				{showPerPage && (
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground whitespace-nowrap">
							{perPageLabel}
						</span>
						<Select
							value={String(perPage)}
							onValueChange={(v) => setPerPage(Number(v))}
						>
							<SelectTrigger className="w-[70px] h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent align="start">
								{perPageOptions.map((n) => (
									<SelectItem key={n} value={String(n)}>
										{n}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				{/* Center: Page numbers */}
				<Pagination className="mx-0 w-auto">
					<PaginationContent>
						{/* Prev arrow */}
						{showArrows && (
							<PaginationItem>
								<PaginationPrevious
									onClick={(e) => {
										e.preventDefault();
										prevPage();
									}}
									className={cn(
										!hasPrevPage &&
											"pointer-events-none opacity-50",
										"cursor-pointer",
									)}
								>
									<span className="sr-only">Previous</span>
								</PaginationPrevious>
							</PaginationItem>
						)}

						{/* Page numbers */}
						{showPageNumbers && (
							<PageNumbers
								page={page}
								totalPages={totalPages}
								maxVisible={maxVisiblePages}
								showFirstLast={showFirstLast}
								onPageChange={setPage}
							/>
						)}

						{/* Next arrow */}
						{showArrows && (
							<PaginationItem>
								<PaginationNext
									onClick={(e) => {
										e.preventDefault();
										nextPage();
									}}
									className={cn(
										!hasNextPage &&
											"pointer-events-none opacity-50",
										"cursor-pointer",
									)}
								>
									<span className="sr-only">Next</span>
								</PaginationNext>
							</PaginationItem>
						)}
					</PaginationContent>
				</Pagination>

				{/* Right: Info */}
				{showInfo && (
					<span className="text-sm text-muted-foreground whitespace-nowrap">
						{totalItems === 0
							? "No items"
							: `${startIndex + 1}–${endIndex} of ${totalItems}`}
					</span>
				)}
			</div>
		);
	}

	// ==========================================================================
	// MODE: LOAD MORE
	// ==========================================================================

	if (mode === "loadMore") {
		return (
			<div
				className={cn(
					"flex flex-col items-center gap-3 pt-4",
					className,
				)}
			>
				{hasNextPage && (
					<Button
						variant="outline"
						onClick={loadMore}
						disabled={isLoading}
					>
						{isLoading && (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						)}
						{loadMoreText}
					</Button>
				)}

				{showInfo && (
					<span className="text-xs text-muted-foreground">
						Showing {endIndex} of {totalItems}
					</span>
				)}
			</div>
		);
	}

	// ==========================================================================
	// MODE: INFINITE SCROLL
	// ==========================================================================

	if (mode === "infinite") {
		return (
			<div
				className={cn(
					"flex flex-col items-center gap-2 pt-4",
					className,
				)}
			>
				{/* Sentinel — IntersectionObserver target */}
				{hasNextPage && (
					<div ref={sentinelRef} className="h-10 flex items-center">
						<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
					</div>
				)}

				{showInfo && (
					<span className="text-xs text-muted-foreground">
						{hasNextPage
							? `Loaded ${endIndex} of ${totalItems}`
							: `All ${totalItems} items loaded`}
					</span>
				)}
			</div>
		);
	}

	return null;
}

// ============================================================================
// PAGE NUMBERS — smart display with ellipsis
// ============================================================================
//
// Examples (maxVisible=5):
//   page 1:  [1] 2 3 ... 24
//   page 2:  1 [2] 3 ... 24
//   page 3:  1 2 [3] 4 ... 24
//   page 12: 1 ... 11 [12] 13 ... 24
//   page 23: 1 ... 22 [23] 24
//   page 24: 1 ... 22 23 [24]

function PageNumbers({
	page,
	totalPages,
	maxVisible,
	showFirstLast,
	onPageChange,
}: {
	page: number;
	totalPages: number;
	maxVisible: number;
	showFirstLast: boolean;
	onPageChange: (p: number) => void;
}) {
	const pages = useMemo(() => {
		if (totalPages <= maxVisible + 2) {
			// Show all pages
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const result: (number | "ellipsis-start" | "ellipsis-end")[] = [];

		// Always show first page
		if (showFirstLast) result.push(1);

		// Calculate window around current page
		const halfWindow = Math.floor((maxVisible - 2) / 2);
		let windowStart = Math.max(2, page - halfWindow);
		let windowEnd = Math.min(totalPages - 1, page + halfWindow);

		// Adjust if near edges
		if (page <= halfWindow + 2) {
			windowEnd = Math.min(totalPages - 1, maxVisible - 1);
			windowStart = 2;
		} else if (page >= totalPages - halfWindow - 1) {
			windowStart = Math.max(2, totalPages - maxVisible + 2);
			windowEnd = totalPages - 1;
		}

		// Ellipsis before window
		if (showFirstLast && windowStart > 2) {
			result.push("ellipsis-start");
		}

		// Window pages
		for (let i = windowStart; i <= windowEnd; i++) {
			result.push(i);
		}

		// Ellipsis after window
		if (showFirstLast && windowEnd < totalPages - 1) {
			result.push("ellipsis-end");
		}

		// Always show last page
		if (showFirstLast) result.push(totalPages);

		return result;
	}, [page, totalPages, maxVisible, showFirstLast]);

	return (
		<>
			{pages.map((p, i) => {
				if (p === "ellipsis-start" || p === "ellipsis-end") {
					return (
						<PaginationItem key={p}>
							<PaginationEllipsis />
						</PaginationItem>
					);
				}

				return (
					<PaginationItem key={p}>
						<PaginationLink
							isActive={p === page}
							onClick={(e) => {
								e.preventDefault();
								onPageChange(p);
							}}
							className="cursor-pointer"
						>
							{p}
						</PaginationLink>
					</PaginationItem>
				);
			})}
		</>
	);
}
