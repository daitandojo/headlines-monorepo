// packages/data-access/src/actions/adminSources.js (version 2.0)
'use server'

import { revalidatePath } from '../revalidate.js'
import { Source } from '../../../models/src/index.js'
import { verifyAdmin } from '../../../auth/src/index.js'
import dbConnect from '../dbConnect.js' // Internal helper

export async function getAllSources() {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const sources = await Source.find({}).sort({ country: 1, name: 1 }).lean()
    return { success: true, data: JSON.parse(JSON.stringify(sources)) }
  } catch (e) {
    console.error('[Admin Action Error - getAllSources]:', e)
    return { success: false, error: 'Failed to fetch sources.' }
  }
}

export async function createSource(sourceData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const newSource = new Source(sourceData)
    await newSource.save()
    await revalidatePath('/admin/sources')
    return { success: true, data: JSON.parse(JSON.stringify(newSource)) }
  } catch (e) {
    console.error('[Admin Action Error - createSource]:', e)
    if (e.code === 11000) {
      return { success: false, error: 'A source with this name already exists.' }
    }
    return { success: false, error: 'Failed to create source.' }
  }
}

export async function updateSource(sourceId, updateData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const updatedSource = await Source.findByIdAndUpdate(sourceId, updateData, {
      new: true,
    }).lean()
    if (!updatedSource) {
      return { success: false, error: 'Source not found.' }
    }
    await revalidatePath('/admin/sources')
    return { success: true, data: JSON.parse(JSON.stringify(updatedSource)) }
  } catch (e) {
    console.error('[Admin Action Error - updateSource]:', e)
    return { success: false, error: 'Failed to update source.' }
  }
}

export async function deleteSource(sourceId) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const result = await Source.findByIdAndDelete(sourceId)
    if (!result) {
      return { success: false, error: 'Source not found.' }
    }
    await revalidatePath('/admin/sources')
    return { success: true }
  } catch (e) {
    console.error('[Admin Action Error - deleteSource]:', e)
    return { success: false, error: 'Failed to delete source.' }
  }
}
