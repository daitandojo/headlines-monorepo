// Full Path: headlines/src/components/client/DataView.jsx
'use client'

import { useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ViewHeader, LoadingOverlay, SkeletonCard } from '@/components/shared'
import { InfiniteScrollLoader } from '@/components/client/InfiniteScrollLoader'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/client'
import { SearchX } from 'lucide-react'
import { EventListWrapper } from '@/components/client/EventListWrapper'
import { ArticleListWrapper } from '@/components/client/ArticleListWrapper'
import { OpportunityListWrapper } from '@/components/client/OpportunityListWrapper'
import { updateUserInteraction } from '@/lib/api-client'
import useAppStore from '@/lib/store/use-app-store'

async function fetchData({ queryKey, pageParam = 1 }) {
  const [queryKeyPrefix, params] = queryKey
  const urlParams = new URLSearchParams()
  urlParams.set('page', pageParam.toString())
  if (params.sort) urlParams.set('sort', params.sort)
  if (params.q) urlParams.set('q', params.q)
  if (params.country) urlParams.set('country', params.country)
  if (params.favoritesOnly) urlParams.set('favorites', 'true')
  if (params.category) urlParams.set('category', params.category)
  if (params.withEmail) urlParams.set('withEmail', 'true')

  const res = await fetch(`/api/${queryKeyPrefix}?${urlParams.toString()}`)
  if (!res.ok) throw new Error('Network response was not ok')
  return res.json()
}

const componentMap = {
  'event-list': EventListWrapper,
  'article-list': ArticleListWrapper,
  'opportunity-list': OpportunityListWrapper,
}

export function DataView({
  viewTitle,
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
  const { user, updateUserPreferences } = useAuth()
  const { globalCountryFilter, setGlobalCountryFilter } = useAppStore()

  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || sortOptions[0].value
  const country = globalCountryFilter.length > 0 ? globalCountryFilter.join(',') : null
  const favoritesOnly = searchParams.get('favorites') === 'true'

  const memoizedSearchParams = useMemo(
    () => ({ q, sort, favoritesOnly, country, ...filters }),
    [q, sort, favoritesOnly, country, filters]
  )
  const listQueryKey = useMemo(
    () => [queryKeyPrefix, memoizedSearchParams],
    [queryKeyPrefix, memoizedSearchParams]
  )

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: listQueryKey,
    queryFn: fetchData,
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.data?.length > 0 ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    initialData: {
      pages: [{ data: initialData || [], total: initialData?.length || 0 }],
      pageParams: [1],
    },
    enabled: !!user,
  })

  const { mutate: performInteraction } = useMutation({
    mutationFn: updateUserInteraction,
    onMutate: async ({ itemId }) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey })
      const previousData = queryClient.getQueryData(listQueryKey)
      queryClient.setQueryData(listQueryKey, (old) => {
        if (!old) return old
        const newPages = old.pages.map((page) => ({
          ...page,
          data: page.data.filter((item) => item._id !== itemId),
        }))
        return { ...old, pages: newPages }
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
    },
  })

  const handleInteraction = (itemId, action) => {
    const itemType = queryKeyPrefix.slice(0, -1)
    performInteraction({ itemId, itemType, action })
  }

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data])

  return (
    <>
      <ViewHeader
        title={viewTitle}
        sortOptions={sortOptions}
        allCountries={allCountries}
        globalCountryFilter={globalCountryFilter}
        onGlobalCountryFilterChange={setGlobalCountryFilter}
      />
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        }
      >
        <div className="relative max-w-5xl mx-auto space-y-6 sm:px-0 -mx-4 px-4">
          <LoadingOverlay isLoading={isFetching && items.length === 0} />
          {items.length > 0 ? (
            <ListComponent
              items={items}
              onDelete={(itemId) => handleInteraction(itemId, 'discard')}
              onFavoriteToggle={(itemId, isFavorited) =>
                handleInteraction(itemId, isFavorited ? 'favorite' : 'unfavorite')
              }
              userFavoritedIds={new Set(user?.favoritedItems?.[queryKeyPrefix] || [])}
            />
          ) : (
            !isFetching && (
              <div className="text-center py-16 text-slate-500">
                <SearchX className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">No results found.</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </div>
            )
          )}
          <InfiniteScrollLoader onLoadMore={fetchNextPage} hasMore={hasNextPage} />
        </div>
      </Suspense>
    </>
  )
}
