// Full Path: headlines/src/components/client/EventListWrapper.jsx
'use client'

import { EventList } from './EventList'

export function EventListWrapper({
  items,
  onDelete,
  onFavoriteToggle,
  userFavoritedIds,
}) {
  return (
    <EventList
      events={items}
      // Standardize the prop name. The swipe action is a "delete" or "discard" action.
      onDelete={onDelete}
      onFavoriteToggle={onFavoriteToggle}
      userFavoritedIds={userFavoritedIds}
    />
  )
}
