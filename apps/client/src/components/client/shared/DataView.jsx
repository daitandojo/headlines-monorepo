// apps/client/src/components/client/shared/DataView.jsx
"use client";

import { useMemo, Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ViewHeader } from "@/components/shared/screen/ViewHeader";
import {
  LoadingOverlay,
  SkeletonEventCard,
  SkeletonOpportunityCard,
  SkeletonList,
  Pagination,
  EmptyState,
  Breadcrumbs,
} from "@/components/shared";
import { EventListWrapper } from "../events/EventListWrapper";
import { ArticleListWrapper } from "../articles/ArticleListWrapper";
import { OpportunityListWrapper } from "../opportunities/OpportunityListWrapper";
import { WatchlistFeedWrapper } from "../watchlist/WatchlistFeedWrapper";
import { InfiniteScrollLoader } from "../../shared/screen/InfiniteScrollLoader";
import { useAuth } from "@/lib/auth/client";
import { toast } from "sonner";
import useAppStore from "@/lib/store/use-app-store";

async function fetchData({ queryKey, pageParam = 1 }) {
  const [queryKeyPrefix, params] = queryKey;
  const urlParams = new URLSearchParams();
  urlParams.set("page", pageParam.toString());
  if (params.sort) urlParams.set("sort", params.sort);
  if (params.q) urlParams.set("q", params.q);
  if (params.withEmail) urlParams.set("withEmail", "true");
  if (params.country) urlParams.set("country", params.country);
  if (params.category) urlParams.set("category", params.category);
  if (params.favorites) urlParams.set("favorites", "true");
  if (params.limit) urlParams.set("limit", params.limit.toString());

  const res = await fetch(`/api/${queryKeyPrefix}?${urlParams.toString()}`);
  if (!res.ok) throw new Error("Network response was not ok");
  return res.json();
}

async function updateUserInteraction(interactionData) {
  const res = await fetch("/api/user/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(interactionData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Interaction failed");
  }
  return res.json();
}

const componentMap = {
  "event-list": EventListWrapper,
  "article-list": ArticleListWrapper,
  "opportunity-list": OpportunityListWrapper,
  "watchlist-feed": WatchlistFeedWrapper,
};

const skeletonMap = {
  "event-list": SkeletonEventCard,
  "article-list": SkeletonList,
  "opportunity-list": SkeletonOpportunityCard,
  "watchlist-feed": SkeletonList,
};

const emptyStateMap = {
  "event-list": "events",
  "article-list": "articles",
  "opportunity-list": "opportunities",
};

export function DataView({
  viewTitle,
  sortOptions,
  queryKeyPrefix,
  listComponentKey,
  initialData,
}) {
  const ListComponent = componentMap[listComponentKey];
  const SkeletonComponent = skeletonMap[listComponentKey] || SkeletonList;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { setTotals, eventTotal, articleTotal, opportunityTotal } =
    useAppStore();

  const initialTotal = useMemo(() => {
    if (queryKeyPrefix === "events") return eventTotal;
    if (queryKeyPrefix === "articles") return articleTotal;
    if (queryKeyPrefix === "opportunities") return opportunityTotal;
    return initialData?.length || 0;
  }, [queryKeyPrefix, eventTotal, articleTotal, opportunityTotal, initialData]);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const q = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || sortOptions[0].value;
  const withEmail = searchParams.get("withEmail") === "true";
  const country = searchParams.get("country") || "";
  const category = searchParams.get("category") || "";
  const favorites = searchParams.get("favorites") === "true";

  const memoizedSearchParams = useMemo(
    () => ({ q, sort, withEmail, country, category, favorites, limit }),
    [q, sort, withEmail, country, category, favorites, limit],
  );
  const listQueryKey = useMemo(
    () => [queryKeyPrefix, memoizedSearchParams],
    [queryKeyPrefix, memoizedSearchParams],
  );

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } =
    useInfiniteQuery({
      queryKey: listQueryKey,
      queryFn: fetchData,
      getNextPageParam: (lastPage, allPages) =>
        lastPage?.data?.length > 0 ? allPages.length + 1 : undefined,
      initialPageParam: 1,
      initialData: {
        pages: [{ data: initialData || [], total: initialTotal }],
        pageParams: [1],
      },
      enabled: !!user,
      staleTime: 60 * 1000,
    });

  useEffect(() => {
    // Mark initial load as complete after first fetch
    if (!isLoading) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    const total = data?.pages?.[0]?.total;
    if (typeof total === "number") {
      if (queryKeyPrefix === "events") setTotals({ eventTotal: total });
      if (queryKeyPrefix === "articles") setTotals({ articleTotal: total });
      if (queryKeyPrefix === "opportunities")
        setTotals({ opportunityTotal: total });
    }
  }, [data, queryKeyPrefix, setTotals]);

  const { mutate: performInteraction } = useMutation({
    mutationFn: updateUserInteraction,
    onMutate: async ({ itemId, itemType, action }) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey });
      await queryClient.cancelQueries({ queryKey: ["user", "profile"] });

      const previousListData = queryClient.getQueryData(listQueryKey);
      const previousUserData = queryClient.getQueryData(["user", "profile"]);

      queryClient.setQueryData(["user", "profile"], (oldUser) => {
        if (!oldUser) return oldUser;
        const favoritedItems = oldUser.favoritedItems?.[`${itemType}s`] || [];
        let newFavoritedItems;
        if (action === "favorite") {
          newFavoritedItems = [...new Set([...favoritedItems, itemId])];
        } else {
          newFavoritedItems = favoritedItems.filter((id) => id !== itemId);
        }
        return {
          ...oldUser,
          favoritedItems: {
            ...oldUser.favoritedItems,
            [`${itemType}s`]: newFavoritedItems,
          },
        };
      });

      if (action === "discard") {
        queryClient.setQueryData(listQueryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((item) => item._id !== itemId),
            })),
          };
        });
      }

      return { previousListData, previousUserData };
    },
    onError: (err, variables, context) => {
      toast.error("Action failed. Restoring data.");
      if (context?.previousListData)
        queryClient.setQueryData(listQueryKey, context.previousListData);
      if (context?.previousUserData)
        queryClient.setQueryData(["user", "profile"], context.previousUserData);
    },
    onSuccess: (data, { action }) => {
      toast.success(`Item ${action}ed.`);
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  const handleInteraction = (item, action) => {
    const itemType = item._type || queryKeyPrefix.replace(/s$/, "");
    performInteraction({ itemId: item._id, itemType, action });
  };

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );
  const totalItems = data?.pages?.[0]?.total || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  const userFavoritedIds = useMemo(() => {
    if (!user?.favoritedItems) return new Set();
    const allIds = [
      ...(user.favoritedItems.articles || []),
      ...(user.favoritedItems.events || []),
      ...(user.favoritedItems.opportunities || []),
    ];
    return new Set(allIds);
  }, [user]);

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    router.push(`?${params.toString()}`);
  };

  const handleEditWatchlist = () => {
    router.push("/my-watchlist");
  };

  const renderEmptyState = () => {
    const emptyType = emptyStateMap[listComponentKey];

    if (q) {
      return (
        <EmptyState
          icon="search"
          title={`No results for "${q}"`}
          description="Try different keywords or clear your search."
          actionLabel="Clear search"
          onAction={handleClearFilters}
        />
      );
    }

    switch (emptyType) {
      case "articles":
        return (
          <EmptyState
            icon="search"
            title="No articles found"
            description="Try adjusting your search or filters to find what you're looking for."
            actionLabel="Clear filters"
            onAction={handleClearFilters}
          />
        );
      case "events":
        return (
          <EmptyState
            icon="empty"
            title="No events match your criteria"
            description="Try adding more countries to your watchlist to see more events."
            actionLabel="Edit watchlist"
            onAction={handleEditWatchlist}
          />
        );
      case "opportunities":
        return (
          <EmptyState
            icon="users"
            title="No opportunities yet"
            description="We'll notify you when opportunities match your criteria."
          />
        );
      default:
        return (
          <EmptyState
            title="No results found"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            onAction={handleClearFilters}
          />
        );
    }
  };

  return (
    <>
      <ViewHeader title={viewTitle} sortOptions={sortOptions} />
      <Suspense fallback={<SkeletonComponent count={5} />}>
        <div className="relative max-w-5xl mx-auto space-y-6">
          {/* Initial loading state with skeletons */}
          {isInitialLoad && isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonComponent key={i} />
              ))}
            </div>
          )}

          {/* Content */}
          {!isInitialLoad && (
            <>
              <LoadingOverlay isLoading={isFetching && items.length === 0} />

              {items.length > 0 ? (
                <>
                  <ListComponent
                    items={items}
                    onDelete={(item) => handleInteraction(item, "discard")}
                    onFavoriteToggle={(item, isFavorited) =>
                      handleInteraction(
                        item,
                        isFavorited ? "favorite" : "unfavorite",
                      )
                    }
                    userFavoritedIds={userFavoritedIds}
                  />

                  {/* Pagination controls */}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={limit}
                  />
                </>
              ) : (
                !isFetching && renderEmptyState()
              )}

              <InfiniteScrollLoader
                onLoadMore={fetchNextPage}
                hasMore={hasNextPage}
              />
            </>
          )}
        </div>
      </Suspense>
    </>
  );
}
