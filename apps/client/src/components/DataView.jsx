// src/components/DataView.jsx (version 2.1)
'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { ViewHeader } from '@/components/ViewHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader'
import { SkeletonCard } from '@/components/SkeletonCard'
import { toast } from 'sonner'
import useAppStore from '@/store/use-app-store'
import { useAuth } from '@/hooks/useAuth'
import { SearchX } from 'lucide-react'
import { getArticles, getTotalArticleCount, deleteArticle } from '@/actions/articles'
import { getEvents, getTotalEventCount, deleteEvent } from '@/actions/events'
import {
  getOpportunities,
  getTotalOpportunitiesCount,
  deleteOpportunity,
} from '@/actions/opportunities'

const SkeletonLoader = ({ count = 5 }) => (
  <div className="max-w-5xl mx-auto space-y-4 px-4 sm:px-0">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

const fnMap = {
  articles: {
    getFn: getArticles,
    getCountFn: getTotalArticleCount,
    deleteFn: deleteArticle,
  },
  events: {
    getFn: getEvents,
    getCountFn: getTotalEventCount,
    deleteFn: deleteEvent,
  },
  opportunities: {
    getFn: getOpportunities,
    getCountFn: getTotalOpportunitiesCount,
    deleteFn: deleteOpportunity,
  },
}

export function DataView({
  viewTitle,
  baseSubtitle,
  sortOptions,
  queryKeyPrefix,
  ListComponent,
  initialData, // <-- Re-add initialData prop
}) {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userCountries = user?.countries || []

  const { getFn, getCountFn, deleteFn } = fnMap[queryKeyPrefix]

  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || 'date_desc'
  const memoizedSearchParams = useMemo(() => ({ q, sort }), [q, sort])

  const isEnabled = !!user

  const { data: count, isLoading: isCountLoading } = useQuery({
    queryKey: [`${queryKeyPrefix}-count`, q, userCountries],
    queryFn: () => getCountFn({ filters: { q, country: userCountries } }),
    enabled: isEnabled,
  })

  const listQueryKey = useMemo(
    () => [queryKeyPrefix, memoizedSearchParams, userCountries],
    [queryKeyPrefix, memoizedSearchParams, userCountries]
  )

  const { data, fetchNextPage, hasNextPage, isFetching, isError } = useInfiniteQuery({
    queryKey: listQueryKey,
    queryFn: ({ pageParam = 1 }) =>
      getFn({
        page: pageParam,
        filters: { q, country: userCountries },
        sort,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.length > 0 ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    // RE-INSTATED: initialData is crucial for a fast, non-stuck initial load.
    initialData: {
      pages: [initialData || []], // Use initialData, fallback to empty array
      pageParams: [1],
    },
    refetchOnWindowFocus: false,
    enabled: isEnabled,
  })

  const { mutate: performDelete } = useMutation({
    mutationFn: deleteFn,
    onMutate: async (idToDelete) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey })
      const previousData = queryClient.getQueryData(listQueryKey)
      queryClient.setQueryData(listQueryKey, (oldData) => {
        if (!oldData) return { pages: [], pageParams: [] }
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.filter((item) => item._id !== idToDelete)
          ),
        }
      })
      toast.success('Item removed.')
      queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-count`] })
      return { previousData }
    },
    onError: (err, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(listQueryKey, context.previousData)
      }
      toast.error('Failed to delete item. Restoring.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-count`] })
    },
  })

  const items = data?.pages.flat() ?? []
  const showLoadingOverlay = isFetching && !data?.pages.length

  return (
    <>
      <ViewHeader
        title={viewTitle}
        baseSubtitle={baseSubtitle}
        count={count}
        isCountLoading={isCountLoading && isEnabled}
        sortOptions={sortOptions}
      />
      <Suspense fallback={<SkeletonLoader />}>
        <div className="max-w-5xl mx-auto space-y-6 sm:px-0 -mx-4 px-4">
          <LoadingOverlay
            isLoading={showLoadingOverlay}
            text={`Fetching ${viewTitle}...`}
          />
          {!showLoadingOverlay && items.length > 0 ? (
            <>
              <ListComponent items={items} onDelete={performDelete} />
              <InfiniteScrollLoader onLoadMore={fetchNextPage} hasMore={hasNextPage} />
            </>
          ) : (
            !isFetching && (
              <div className="text-center text-gray-500 py-20 px-4 rounded-lg bg-black/20 border border-white/10 flex flex-col items-center justify-center">
                <SearchX className="h-16 w-16 text-slate-700" />
                <p className="mt-4 text-lg font-semibold text-slate-300">
                  No {baseSubtitle} found matching your criteria.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Try adjusting your search or country filter.
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
