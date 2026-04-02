"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@headlines/utils-shared";

export function Breadcrumbs({ items = [], className }) {
  if (items.length === 0) return null;

  return (
    <nav className={cn("flex items-center gap-1 text-sm", className)}>
      {/* Home link */}
      <Link
        href="/"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />

            {isLast || !item.href ? (
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
