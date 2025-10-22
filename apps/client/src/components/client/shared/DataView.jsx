// apps/client/src/components/client/shared/DataView.jsx
'use client'

import { useMemo, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ViewHeader } from '@/components/shared/screen/ViewHeader'
import { LoadingOverlay, SkeletonCard } from '@/components/shared'
import { EventListWrapper } from '../events/EventListWrapper'
import { ArticleListWrapper } from '../articles/ArticleListWrapper'
import { OpportunityListWrapper } from '../opportunities/OpportunityListWrapper'
import { WatchlistFeedWrapper } from '../watchlist/WatchlistFeedWrapper' // IMPORTED
import { InfiniteScrollLoader } from '../../shared/screen/InfiniteScrollLoader'
import { useAuth } from '@/lib/auth/client'
import { toast } from 'sonner'
import { SearchX } from 'lucide-react'
import useAppStore from '@/lib/store/use-app-store'

async function fetchData({ queryKey, pageParam = 1 }) {
  const [queryKeyPrefix, params] = queryKey
  const urlParams = new URLSearchParams()
  urlParams.set('page', pageParam.toString())
  if (params.sort) urlParams.set('sort', params.sort)
  if (params.q) urlParams.set('q', params.q)
  if (params.withEmail) urlParams.set('withEmail', 'true')
  if (params.country) urlParams.set('country', params.country)
  if (params.category) urlParams.set('category', params.category)
  if (params.favorites) urlParams.set('favorites', 'true')

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

// --- START OF MODIFICATION ---
const componentMap = {
  'event-list': EventListWrapper,
  'article-list': ArticleListWrapper,
  'opportunity-list': OpportunityListWrapper,
  'watchlist-feed': WatchlistFeedWrapper, // ADDED MAPPING
}
// --- END OF MODIFICATION ---

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

  const { setTotals, eventTotal, articleTotal, opportunityTotal } = useAppStore()

  const initialTotal = useMemo(() => {
    if (queryKeyPrefix === 'events') return eventTotal
    if (queryKeyPrefix === 'articles') return articleTotal
    if (queryKeyPrefix === 'opportunities') return opportunityTotal
    return initialData?.length || 0
  }, [queryKeyPrefix, eventTotal, articleTotal, opportunityTotal, initialData])

  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || sortOptions[0].value
  const withEmail = searchParams.get('withEmail') === 'true'
  const country = searchParams.get('country') || ''
  const category = searchParams.get('category') || ''
  const favorites = searchParams.get('favorites') === 'true'

  const memoizedSearchParams = useMemo(
    () => ({ q, sort, withEmail, country, category, favorites }),
    [q, sort, withEmail, country, category, favorites]
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
      pages: [{ data: initialData || [], total: initialTotal }],
      pageParams: [1],
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    const total = data?.pages?.[0]?.total
    if (typeof total === 'number') {
      if (queryKeyPrefix === 'events') setTotals({ eventTotal: total })
      if (queryKeyPrefix === 'articles') setTotals({ articleTotal: total })
      if (queryKeyPrefix === 'opportunities') setTotals({ opportunityTotal: total })
    }
  }, [data, queryKeyPrefix, setTotals])

  const { mutate: performInteraction } = useMutation({
    mutationFn: updateUserInteraction,
    onMutate: async ({ itemId, itemType, action }) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey })
      await queryClient.cancelQueries({ queryKey: ['user', 'profile'] })

      const previousListData = queryClient.getQueryData(listQueryKey)
      const previousUserData = queryClient.getQueryData(['user', 'profile'])

      queryClient.setQueryData(['user', 'profile'], (oldUser) => {
        if (!oldUser) return oldUser
        const favoritedItems = oldUser.favoritedItems?.[`${itemType}s`] || []
        let newFavoritedItems
        if (action === 'favorite') {
          newFavoritedItems = [...new Set([...favoritedItems, itemId])]
        } else {
          newFavoritedItems = favoritedItems.filter((id) => id !== itemId)
        }
        return {
          ...oldUser,
          favoritedItems: {
            ...oldUser.favoritedItems,
            [`${itemType}s`]: newFavoritedItems,
          },
        }
      })

      if (action === 'discard') {
        queryClient.setQueryData(listQueryKey, (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((item) => item._id !== itemId),
            })),
          }
        })
      }

      return { previousListData, previousUserData }
    },
    onError: (err, variables, context) => {
      toast.error('Action failed. Restoring data.')
      if (context?.previousListData)
        queryClient.setQueryData(listQueryKey, context.previousListData)
      if (context?.previousUserData)
        queryClient.setQueryData(['user', 'profile'], context.previousUserData)
    },
    onSuccess: (data, { action }) => {
      toast.success(`Item ${action}ed.`)
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
      queryClient.invalidateQueries({ queryKey: listQueryKey })
    },
  })

  const handleInteraction = (item, action) => {
    // DEFINITIVE FIX:
    // The watchlist feed provides `_type` on each item. For dedicated pages
    // (articles, events, opportunities), we derive the type from the `queryKeyPrefix` prop.
    // This ensures `itemType` is never undefined.
    const itemType = item._type || queryKeyPrefix.replace(/s$/, '')
    performInteraction({ itemId: item._id, itemType, action })
  }

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data])
  // This now needs to merge all favorited item types
  const userFavoritedIds = useMemo(() => {
    if (!user?.favoritedItems) return new Set()
    const allIds = [
      ...(user.favoritedItems.articles || []),
      ...(user.favoritedItems.events || []),
      ...(user.favoritedItems.opportunities || []),
    ]
    return new Set(allIds)
  }, [user])

  return (
    <>
      <ViewHeader title={viewTitle} sortOptions={sortOptions} />
      <Suspense fallback={<SkeletonCard />}>
        <div className="relative max-w-5xl mx-auto space-y-6">
          <LoadingOverlay isLoading={isFetching && items.length === 0} />
          {items.length > 0 ? (
            <ListComponent
              items={items}
              // MODIFIED: Pass the full item to the interaction handler
              onDelete={(item) => handleInteraction(item, 'discard')}
              onFavoriteToggle={(item, isFavorited) =>
                handleInteraction(item, isFavorited ? 'favorite' : 'unfavorite')
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
