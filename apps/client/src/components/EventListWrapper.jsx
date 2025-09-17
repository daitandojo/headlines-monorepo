// src/components/EventListWrapper.jsx (version 1.0)
'use client'

import { EventList } from './EventList'

export function EventListWrapper({ items, onDelete }) {
  // The 'items' prop from DataView maps to the 'events' prop for EventList
  return <EventList events={items} onDelete={onDelete} />
}
