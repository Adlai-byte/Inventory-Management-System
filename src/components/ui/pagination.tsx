"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationProps extends React.ComponentProps<"nav"> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  ...props
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // Logic to show a limited number of page buttons with ellipses
  const maxVisible = 5;
  let visiblePages: (number | "ellipsis")[] = [];

  if (totalPages <= maxVisible) {
    visiblePages = pages;
  } else {
    if (currentPage <= 3) {
      visiblePages = [1, 2, 3, 4, "ellipsis", totalPages];
    } else if (currentPage >= totalPages - 2) {
      visiblePages = [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      visiblePages = [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
    }
  }

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center gap-1", className)}
      {...props}
    >
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 pl-2.5 h-9"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <div className="flex items-center gap-1">
        {visiblePages.map((page, index) => (
          <React.Fragment key={index}>
            {page === "ellipsis" ? (
              <span className="flex h-9 w-9 items-center justify-center">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">More pages</span>
              </span>
            ) : (
              <Button
                variant={currentPage === page ? "outline" : "ghost"}
                size="icon"
                className={cn(
                  "h-9 w-9",
                  currentPage === page && "border-primary text-primary hover:bg-primary/5 hover:text-primary"
                )}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1 pr-2.5 h-9"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
