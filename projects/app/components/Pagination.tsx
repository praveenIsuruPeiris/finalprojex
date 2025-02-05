"use client";
import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // Optional props for showing result info (e.g., “Showing 1 to 10 of 97 results”)
  startResult?: number;
  endResult?: number;
  totalResults?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  startResult,
  endResult,
  totalResults,
}) => {
  // Helper to generate page numbers with ellipsis
  const getPageNumbers = (current: number, total: number): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(current - 1);
        pages.push(current);
        pages.push(current + 1);
        pages.push("...");
        pages.push(total);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 sm:px-6 text-gray-700 dark:text-gray-300">
      {/* Mobile Pagination */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Next
        </button>
      </div>

      {/* Desktop Pagination */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        {/* Results info (optional) */}
        {(startResult !== undefined &&
          endResult !== undefined &&
          totalResults !== undefined) && (
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{startResult}</span> to{" "}
              <span className="font-medium">{endResult}</span> of{" "}
              <span className="font-medium">{totalResults}</span> results
            </p>
          </div>
        )}

        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-xs"
            aria-label="Pagination"
          >
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-400 ring-1 ring-gray-300 dark:ring-gray-600 ring-inset hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0"
            >
              <span className="sr-only">Previous</span>
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {pageNumbers.map((page, index) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 ring-inset"
                >
                  {page}
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(Number(page))}
                  aria-current={page === currentPage ? "page" : undefined}
                  className={
                    page === currentPage
                      ? "relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus:outline-offset-0"
                      : "relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 ring-1 ring-gray-300 dark:ring-gray-600 ring-inset hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0"
                  }
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-gray-400 ring-1 ring-gray-300 dark:ring-gray-600 ring-inset hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0"
            >
              <span className="sr-only">Next</span>
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10l-3.72-3.72a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
