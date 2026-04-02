// apps/client/src/components/shared/skeletons/SkeletonOpportunityCard.jsx
"use client";

import { cn } from "@headlines/utils-shared";

export function SkeletonOpportunityCard({ className }) {
  return (
    <div
      className={cn("bg-card border rounded-lg p-4 animate-pulse", className)}
    >
      <div className="flex gap-4">
        {/* Wealth column */}
        <div className="flex flex-col items-center shrink-0 w-20">
          <div className="h-10 w-14 bg-muted rounded"></div>
          <div className="h-3 w-12 bg-muted rounded mt-2"></div>
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0 space-y-3">
          <div className="h-6 w-3/4 bg-muted rounded"></div>
          <div className="h-4 w-1/2 bg-muted rounded"></div>

          <div className="pt-2">
            <div className="h-4 w-full bg-muted rounded mb-2"></div>
            <div className="h-4 w-4/5 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
