'use server'

import { revalidatePath } from 'next/cache'
import dbConnect from '@headlines/data-access/dbConnect.js'
import { updateOpportunity, deleteOpportunity } from '@headlines/data-access'

export async function updateOpportunityAction(opportunityId, updateData) {
  await dbConnect()
  const result = await updateOpportunity(opportunityId, updateData)
  if (result.success) {
    revalidatePath('/admin/opportunities')
  }
  return result
}

export async function deleteOpportunityAction(opportunityId) {
  await dbConnect()
  const result = await deleteOpportunity(opportunityId)
  if (result.success) {
    revalidatePath('/admin/opportunities')
  }
  return result
}
