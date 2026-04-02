"use client";

import { cn } from "@headlines/utils-shared";
import { Button } from "@/components/shared";
import { FileQuestion, Search, Inbox, Users } from "lucide-react";

const icons = {
  default: FileQuestion,
  search: Search,
  empty: Inbox,
  users: Users,
};

export function EmptyState({
  title,
  description,
  icon = "default",
  actionLabel,
  onAction,
  className,
}) {
  const Icon = icons[icon] || icons.default;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className,
      )}
    >
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>

      <h3 className="text-xl font-semibold mb-2">{title}</h3>

      {description && (
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function ArticlesEmptyState({ onClearFilters, className }) {
  return (
    <EmptyState
      icon="search"
      title="No articles found"
      description="Try adjusting your search or filters to find what you're looking for."
      actionLabel="Clear filters"
      onAction={onClearFilters}
      className={className}
    />
  );
}

export function EventsEmptyState({ onEditWatchlist, className }) {
  return (
    <EmptyState
      icon="empty"
      title="No events match your criteria"
      description="Try adding more countries to your watchlist to see more events."
      actionLabel="Edit watchlist"
      onAction={onEditWatchlist}
      className={className}
    />
  );
}

export function OpportunitiesEmptyState({ className }) {
  return (
    <EmptyState
      icon="users"
      title="No opportunities yet"
      description="We'll notify you when opportunities match your criteria."
      className={className}
    />
  );
}

export function SearchEmptyState({ query, onClearSearch, className }) {
  return (
    <EmptyState
      icon="search"
      title={`No results for "${query}"`}
      description="Try different keywords or clear your search."
      actionLabel="Clear search"
      onAction={onClearSearch}
      className={className}
    />
  );
}
