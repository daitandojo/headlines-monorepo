// apps/client/src/components/shared/skeletons/SkeletonList.jsx
"use client";

import { Skeleton } from "./Skeleton";

export function SkeletonList({ count = 5, className }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 py-3 border-b last:border-0"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-grow space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
