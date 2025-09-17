// apps/client/src/components/DataView.jsx (version 10.4.0 - Hydration Fix)
'use client'

import { useMemo, Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from '@tanstack/react-query'
import { ViewHeader, LoadingOverlay, SkeletonCard } from '@headlines/ui'
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader'
import { toast } from 'sonner'
import { useAuth } from '@headlines/auth/src/useAuth.js'
import useAppStore from '@/store/use-app-store'
import { SearchX } from 'lucide-react'
import {
  getArticles,
  getTotalArticleCount,
  getEvents,
  getTotalEventCount,
  getOpportunities,
  getTotalOpportunitiesCount,
  updateUserInteraction,
} from '@headlines/data-access'
import { EventList } from './EventList'
import { ArticleList } from './ArticleList'
import { OpportunityListWrapper } from './OpportunityListWrapper'

const componentMap = {
  'event-list': EventList,
  'article-list': ArticleList,
  'opportunity-list': OpportunityListWrapper,
}

const SkeletonLoader = ({ count = 5 }) => (
  <div className="max-w-5xl mx-auto space-y-4 px-4 sm:px-0">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

const fnMap = {
  articles: { getFn: getArticles, getCountFn: getTotalArticleCount },
  events: { getFn: getEvents, getCountFn: getTotalEventCount },
  opportunities: { getFn: getOpportunities, getCountFn: getTotalOpportunitiesCount },
}

export function DataView({
  viewTitle,
  baseSubtitle,
  sortOptions,
  queryKeyPrefix,
  listComponentKey,
  initialData,
  filters,
  allCountries,
}) {
  const ListComponent = componentMap[listComponentKey]
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { globalCountryFilter } = useAppStore()

  const [viewCountry, setViewCountry] = useState(filters?.country || 'all')

  useEffect(() => {
    setViewCountry('all')
  }, [globalCountryFilter])

  const { getFn, getCountFn } = fnMap[queryKeyPrefix]

  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || 'date_desc'
  const category = searchParams.get('category')

  const country = useMemo(() => {
    if (viewCountry !== 'all') return viewCountry
    // DEFINITIVE FIX: Add a check to ensure globalCountryFilter is an array before accessing its length.
    // This prevents a TypeError during the initial client render before the store is fully hydrated.
    if (Array.isArray(globalCountryFilter) && globalCountryFilter.length > 0) {
      return globalCountryFilter.join(',')
    }
    return null
  }, [viewCountry, globalCountryFilter])

  const favoritesOnly = searchParams.get('favorites') === 'true'

  const memoizedSearchParams = useMemo(
    () => ({ q, sort, favoritesOnly, category, country, withEmail: filters.withEmail }),
    [q, sort, favoritesOnly, category, country, filters.withEmail]
  )
  const listQueryKey = useMemo(
    () => [queryKeyPrefix, memoizedSearchParams],
    [queryKeyPrefix, memoizedSearchParams]
  )

  const { data: count, isLoading: isCountLoading } = useQuery({
    queryKey: [`${queryKeyPrefix}-count`, memoizedSearchParams],
    queryFn: () => getCountFn({ filters: memoizedSearchParams, userId: user?._id }),
    enabled: !!user,
  })

  const { data, fetchNextPage, hasNextPage, isFetching, isError } = useInfiniteQuery({
    queryKey: listQueryKey,
    queryFn: ({ pageParam = 1 }) =>
      getFn({ page: pageParam, filters: memoizedSearchParams, sort, userId: user?._id }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.length > 0 ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    initialData: { pages: [initialData || []], pageParams: [1] },
    enabled: !!user,
  })

  const { mutate: performInteraction } = useMutation({
    mutationFn: (variables) => updateUserInteraction(variables),
    onMutate: async ({ itemId, action }) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey })
      const previousData = queryClient.getQueryData(listQueryKey)
      queryClient.setQueryData(listQueryKey, (old) => {
        if (!old) return old
        if (action === 'discard') {
          return {
            ...old,
            pages: old.pages.map((p) => p.filter((item) => item._id !== itemId)),
          }
        }
        if (action === 'favorite' || action === 'unfavorite') {
          const isFavorited = action === 'favorite'
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((item) => (item._id === itemId ? { ...item, isFavorited } : item))
            ),
          }
        }
        return old
      })
      return { previousData }
    },
    onError: (err, variables, context) => {
      toast.error('Action failed. Restoring data.')
      if (context?.previousData)
        queryClient.setQueryData(listQueryKey, context.previousData)
    },
    onSuccess: (data, { action }) => {
      toast.success(`Item ${action}ed.`)
      queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-count`] })
    },
  })

  const handleSwipeLeft = (variables) => {
    if (user) {
      const itemType = queryKeyPrefix.slice(0, -1)
      performInteraction({ ...variables, itemType, userId: user._id, action: 'discard' })
    }
  }

  const handleFavoriteToggle = (itemId, isFavorited) => {
    if (user)
      performInteraction({
        userId: user._id,
        itemId,
        itemType: 'event',
        action: isFavorited ? 'favorite' : 'unfavorite',
      })
  }

  const items = useMemo(() => data?.pages.flat() ?? [], [data])
  const showLoadingOverlay = isFetching && !items.length
  const userFavoritedIds = useMemo(
    () => new Set(user?.favoritedItems?.events || []),
    [user]
  )

  return (
    <>
      <ViewHeader
        title={viewTitle}
        sortOptions={sortOptions}
        allCountries={allCountries}
        globalCountryFilter={globalCountryFilter}
        viewCountry={viewCountry}
        onViewCountryChange={setViewCountry}
      />
      <Suspense fallback={<SkeletonLoader />}>
        <div className="max-w-5xl mx-auto space-y-6 sm:px-0 -mx-4 px-4">
          <LoadingOverlay
            isLoading={showLoadingOverlay}
            text={`Fetching ${viewTitle}...`}
          />
          {!showLoadingOverlay && items.length > 0 ? (
            <>
              <ListComponent
                items={items}
                onSwipeLeft={handleSwipeLeft}
                onFavoriteToggle={handleFavoriteToggle}
                userFavoritedIds={userFavoritedIds}
              />
              <InfiniteScrollLoader onLoadMore={fetchNextPage} hasMore={hasNextPage} />
            </>
          ) : (
            !isFetching && (
              <div className="text-center text-gray-500 py-20 px-4 rounded-lg bg-black/20 border border-white/10 flex flex-col items-center justify-center">
                <SearchX className="h-16 w-16 text-slate-700" />
                <p className="mt-4 text-lg font-semibold text-slate-300">
                  No {baseSubtitle} found.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Try adjusting your global region filter or search terms.
                </p>
              </div>
            )
          )}
          {isError && (
            <div className="text-center text-red-400 py-20">
              <p>Failed to load {baseSubtitle}. Please try again later.</p>
            </div>
          )}
        </div>
      </Suspense>
    </>
  )
}
