// apps/client/src/components/shared/skeletons/SkeletonEventCard.jsx
"use client";

import { cn } from "@headlines/utils-shared";

export function SkeletonEventCard({ className }) {
  return (
    <div
      className={cn("bg-card border rounded-lg p-4 animate-pulse", className)}
    >
      <div className="flex gap-4">
        {/* Score column */}
        <div className="flex flex-col items-center shrink-0 w-16">
          <div className="h-10 w-10 bg-muted rounded-full"></div>
          <div className="h-3 w-8 bg-muted rounded mt-2"></div>
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0 space-y-3">
          <div className="h-5 w-3/4 bg-muted rounded"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-5/6 bg-muted rounded"></div>

          <div className="flex gap-2 pt-2">
            <div className="h-5 w-16 bg-muted rounded-full"></div>
            <div className="h-5 w-20 bg-muted rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
