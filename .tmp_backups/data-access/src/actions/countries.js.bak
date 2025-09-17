// packages/data-access/src/actions/countries.js (version 2.2.0)
'use server'

import { revalidatePath } from '../revalidate.js'
import { Country } from '@headlines/models'
import { verifyAdmin } from '@headlines/auth'
import dbConnect from '../dbConnect.js'

// This function is for the admin panel and requires authentication.
export async function getAllCountries() {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }
  try {
    await dbConnect()
    const countries = await Country.aggregate([
      { $match: {} },
      {
        $lookup: {
          from: 'synthesized_events',
          localField: 'name',
          foreignField: 'country',
          as: 'events',
        },
      },
      {
        $lookup: {
          from: 'sources',
          localField: 'name',
          foreignField: 'country',
          as: 'sources',
        },
      },
      {
        $project: {
          name: 1,
          isoCode: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          eventCount: { $size: '$events' },
          sourceCount: { $size: '$sources' },
          activeSourceCount: {
            $size: {
              $filter: {
                input: '$sources',
                as: 'source',
                cond: { $eq: ['$$source.status', 'active'] },
              },
            },
          },
        },
      },
    ])
    return { success: true, data: JSON.parse(JSON.stringify(countries)) }
  } catch (e) {
    console.error('[Action Error - getAllCountries]:', e)
    return { success: false, error: 'Failed to fetch countries with aggregate data.' }
  }
}

// This is a new, public-facing function for the client app layout. It does not require admin auth.
export async function getGlobalCountries() {
  try {
    await dbConnect()
    const countries = await Country.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'synthesized_events',
          localField: 'name',
          foreignField: 'country',
          as: 'events',
        },
      },
      { $project: { name: 1, count: { $size: '$events' } } },
      { $sort: { name: 1 } },
    ])
    return { success: true, data: JSON.parse(JSON.stringify(countries)) }
  } catch (e) {
    console.error('[Action Error - getGlobalCountries]:', e)
    return { success: false, error: 'Failed to fetch global country list.' }
  }
}

export async function createCountry(countryData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const newCountry = new Country(countryData)
    await newCountry.save()
    await revalidatePath('/admin/countries')
    return { success: true, data: JSON.parse(JSON.stringify(newCountry)) }
  } catch (e) {
    if (e.code === 11000) return { success: false, error: 'Country already exists.' }
    return { success: false, error: 'Failed to create country.' }
  }
}

export async function updateCountry(countryId, updateData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const country = await Country.findByIdAndUpdate(countryId, updateData, {
      new: true,
    }).lean()
    if (!country) return { success: false, error: 'Country not found.' }
    await revalidatePath('/admin/countries')
    return { success: true, data: JSON.parse(JSON.stringify(country)) }
  } catch (e) {
    return { success: false, error: 'Failed to update country.' }
  }
}
