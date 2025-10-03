// File: client/src/components/client/shared/DataView.jsx
'use client'

import { useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ViewHeader } from '@/components/shared/screen/ViewHeader'
import { LoadingOverlay, SkeletonCard } from '@/components/shared'
import { EventListWrapper } from '../events/EventListWrapper'
import { ArticleListWrapper } from '../articles/ArticleListWrapper'
import { OpportunityListWrapper } from '../opportunities/OpportunityListWrapper'
import { InfiniteScrollLoader } from '../../shared/screen/InfiniteScrollLoader'
import { useAuth } from '@/lib/auth/client'
import { toast } from 'sonner'
import { SearchX } from 'lucide-react'

async function fetchData({ queryKey, pageParam = 1 }) {
  const [queryKeyPrefix, params] = queryKey
  const urlParams = new URLSearchParams()
  urlParams.set('page', pageParam.toString())
  if (params.sort) urlParams.set('sort', params.sort)
  if (params.q) urlParams.set('q', params.q)
  if (params.withEmail) urlParams.set('withEmail', 'true')

  const res = await fetch(`/api/${queryKeyPrefix}?${urlParams.toString()}`)
  if (!res.ok) throw new Error('Network response was not ok')
  return res.json()
}

async function updateUserInteraction(interactionData) {
  const res = await fetch('/api/user/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(interactionData),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Interaction failed')
  }
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
}) {
  const ListComponent = componentMap[listComponentKey]
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || sortOptions[0].value
  const withEmail = searchParams.get('withEmail') === 'true'

  const memoizedSearchParams = useMemo(
    () => ({ q, sort, withEmail }),
    [q, sort, withEmail]
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
    // --- START OF THE FIX ---
    // This tells React Query that the initial data from SSR is fresh
    // and prevents it from immediately re-fetching on the client.
    staleTime: 60 * 1000,
    // --- END OF THE FIX ---
  })

  const { mutate: performInteraction } = useMutation({
    mutationFn: updateUserInteraction,
    onMutate: async ({ itemId, action }) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey })
      const previousData = queryClient.getQueryData(listQueryKey)

      if (action === 'discard') {
        queryClient.setQueryData(listQueryKey, (old) => {
          if (!old) return old
          const newPages = old.pages.map((page) => ({
            ...page,
            data: page.data.filter((item) => item._id !== itemId),
          }))
          return { ...old, pages: newPages }
        })
      }
      return { previousData }
    },
    onError: (err, variables, context) => {
      toast.error('Action failed. Restoring data.')
      if (context?.previousData) {
        queryClient.setQueryData(listQueryKey, context.previousData)
      }
    },
    onSuccess: (data, { action }) => {
      toast.success(`Item ${action}ed.`)
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
      router.refresh()
    },
  })

  const handleInteraction = (itemId, action) => {
    performInteraction({ itemId, itemType: queryKeyPrefix.slice(0, -1), action })
  }

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data])
  const userFavoritedIds = useMemo(
    () => new Set(user?.favoritedItems?.[queryKeyPrefix] || []),
    [user, queryKeyPrefix]
  )

  return (
    <>
      <ViewHeader title={viewTitle} sortOptions={sortOptions} searchTerm={q} />
      <Suspense fallback={<SkeletonCard />}>
        <div className="relative max-w-5xl mx-auto space-y-6">
          <LoadingOverlay isLoading={isFetching && items.length === 0} />
          {items.length > 0 ? (
            <ListComponent
              items={items}
              onDelete={(itemId) => handleInteraction(itemId, 'discard')}
              onFavoriteToggle={(itemId, isFavorited) =>
                handleInteraction(itemId, isFavorited ? 'favorite' : 'unfavorite')
              }
              userFavoritedIds={userFavoritedIds}
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
