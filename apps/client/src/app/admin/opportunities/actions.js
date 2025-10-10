// apps/client/src/app/admin/opportunities/actions.js
'use server'

import { createAdminAction } from '@/lib/actions/createAdminAction'
import { updateOpportunity, deleteOpportunity } from '@headlines/data-access/next'

export const updateOpportunityAction = createAdminAction(
  updateOpportunity,
  '/admin/opportunities'
)

export const deleteOpportunityAction = createAdminAction(
  deleteOpportunity,
  '/admin/opportunities'
)
