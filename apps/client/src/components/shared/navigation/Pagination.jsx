"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/shared";
import { cn } from "@headlines/utils-shared";

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  onItemsPerPageChange,
  className,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newLimit);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set("limit", newLimit.toString());
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    }
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5; // Show up to 5 page numbers

    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-4",
        className,
      )}
    >
      {/* Items per page selector */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Show</span>
        <select
          value={itemsPerPage}
          onChange={handleLimitChange}
          className="bg-background border rounded-md px-2 py-1 min-h-[36px]"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>per page</span>
      </div>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {/* First */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className="hidden sm:flex h-9 w-9"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span key={idx} className="px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={idx}
              variant={currentPage === page ? "default" : "ghost"}
              size="icon"
              onClick={() => goToPage(page)}
              className="h-9 w-9"
            >
              {page}
            </Button>
          ),
        )}

        {/* Next */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-9 w-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className="hidden sm:flex h-9 w-9"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Total info */}
      <div className="text-sm text-muted-foreground hidden sm:block">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
}
