// apps/client/src/components/shared/skeletons/SkeletonTable.jsx
"use client";

import { Skeleton } from "./Skeleton";

export function SkeletonTable({ rows = 5, cols = 4, className }) {
  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Header row */}
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-8 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
