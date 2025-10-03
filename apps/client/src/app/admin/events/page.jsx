// apps/client/src/app/admin/events/page.jsx
import { getEvents } from '@headlines/data-access'
import EventsClientPage from './EventsClientPage' // New client component
import dbConnect from '@headlines/data-access/dbConnect/next'

export const dynamic = 'force-dynamic'

export default async function EventsPage({ searchParams }) {
  await dbConnect()
  const page = parseInt(searchParams.page || '1', 10)
  const sort = searchParams.sort || null

  // The custom list view for events doesn't support columnFilters, so we pass an empty object.
  const filters = {}

  const result = await getEvents({ page, filters, sort })

  return (
    <EventsClientPage
      initialEvents={result.success ? result.data : []}
      total={result.success ? result.total : 0}
    />
  )
}
