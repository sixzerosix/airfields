"use client";

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
	showPageNumbers?: boolean;
	showArrows?: boolean;
	showPerPage?: boolean;
	showInfo?: boolean;
	showFirstLast?: boolean;
	maxVisiblePages?: number;
	loadMoreText?: string;
	isLoading?: boolean;
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

				<Pagination className="mx-0 w-auto">
					<PaginationContent>
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

						{showPageNumbers && (
							<PageNumbers
								page={page}
								totalPages={totalPages}
								maxVisible={maxVisiblePages}
								showFirstLast={showFirstLast}
								onPageChange={setPage}
							/>
						)}

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
// ✅ FIXED PAGE NUMBERS — correct ellipsis logic
// ============================================================================
//
// maxVisible=5:
//   totalPages=5:   1  2  3  4  5           ← все видны, нет ellipsis
//   totalPages=6:   1  2  3  ...  6         ← ellipsis появляется
//   totalPages=20:
//     page 1:   [1]  2  3  ...  20
//     page 3:    1   2  [3]  4  ...  20
//     page 10:   1  ...  9  [10]  11  ...  20
//     page 19:   1  ...  18  [19]  20
//     page 20:   1  ...  18  19  [20]

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
		// ✅ FIX: показываем все только если totalPages <= maxVisible
		// БЫЛО: totalPages <= maxVisible + 2  ← слишком щедро
		if (totalPages <= maxVisible) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const result: (number | "ellipsis-start" | "ellipsis-end")[] = [];

		// Сколько "средних" страниц показывать (без first/last)
		const middleSlots = showFirstLast ? maxVisible - 2 : maxVisible;
		const halfMiddle = Math.floor(middleSlots / 2);

		// First page
		if (showFirstLast) result.push(1);

		// Window around current page
		let windowStart = Math.max(2, page - halfMiddle);
		let windowEnd = Math.min(totalPages - 1, page + halfMiddle);

		// Adjust window at edges
		if (page - halfMiddle <= 2) {
			// Near start
			windowStart = 2;
			windowEnd = Math.min(totalPages - 1, 2 + middleSlots - 1);
		} else if (page + halfMiddle >= totalPages - 1) {
			// Near end
			windowEnd = totalPages - 1;
			windowStart = Math.max(2, totalPages - 1 - middleSlots + 1);
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

		// Last page
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
