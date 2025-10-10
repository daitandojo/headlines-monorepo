// apps/client/src/app/admin/events/actions.js
'use server'

import { createAdminAction } from '@/lib/actions/createAdminAction'
import { deleteEvent, updateEvent, getEventDetails } from '@headlines/data-access/next'

// These actions will be called by the client component.
// The factory handles dbConnect() and revalidation.
export const updateEventAction = createAdminAction(updateEvent, '/admin/events')

export const deleteEventAction = createAdminAction(deleteEvent, '/admin/events')

// No revalidation path is needed for a simple data fetch.
export const getEventDetailsAction = createAdminAction(getEventDetails)
