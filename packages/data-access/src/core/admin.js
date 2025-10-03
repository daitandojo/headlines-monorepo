// packages/data-access/src/core/admin.js
import {
  Subscriber,
  Country,
  Source,
  WatchlistEntity,
  WatchlistSuggestion,
  SourceSuggestion,
} from '@headlines/models'
import { buildQuery } from '../queryBuilder.js'
import { createSubscriberWithPassword } from './auth.js'

export async function createSubscriber(userData) {
  // Delegate user creation with a password to the specialized function
  if (userData.password) {
    return createSubscriberWithPassword(userData)
  }

  // Handle cases where a user might be created without a password initially (e.g., invites)
  try {
    const newUser = new Subscriber(userData)
    await newUser.save()
    return { success: true, subscriber: JSON.parse(JSON.stringify(newUser)) }
  } catch (e) {
    if (e.code === 11000)
      return { success: false, error: 'A user with this email already exists.' }
    return { success: false, error: 'Failed to create subscriber.' }
  }
}

export async function updateSubscriber(userId, updateData) {
  try {
    // Explicitly remove password from general updates. It must be updated via its own function.
    if (updateData.password) {
      delete updateData.password
    }

    const user = await Subscriber.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean()
    if (!user) return { success: false, error: 'User not found.' }
    return { success: true, subscriber: JSON.parse(JSON.stringify(user)) }
  } catch (e) {
    console.error('[updateSubscriber Error]', e)
    return { success: false, error: 'Failed to update subscriber.' }
  }
}

export async function deleteSubscriber(userId) {
  try {
    const result = await Subscriber.findByIdAndDelete(userId)
    if (!result) return { success: false, error: 'User not found.' }
    return { success: true }
  } catch (e) {
    console.error('[deleteSubscriber Error]', e)
    return { success: false, error: 'Failed to delete subscriber.' }
  }
}

export async function createCountry(countryData) {
  try {
    const newCountry = new Country(countryData)
    await newCountry.save()
    return { success: true, country: JSON.parse(JSON.stringify(newCountry)) }
  } catch (e) {
    if (e.code === 11000) return { success: false, error: 'Country already exists.' }
    return { success: false, error: 'Failed to create country.' }
  }
}

export async function updateCountry(filter, update, options) {
  try {
    const country = await Country.findOneAndUpdate(filter, update, {
      new: true,
      ...options,
    }).lean()
    return { success: true, country: JSON.parse(JSON.stringify(country)) }
  } catch (e) {
    return { success: false, error: 'Failed to update country.' }
  }
}

export async function createSource(sourceData) {
  try {
    const newSource = new Source(sourceData)
    await newSource.save()
    return { success: true, source: JSON.parse(JSON.stringify(newSource)) }
  } catch (e) {
    if (e.code === 11000)
      return { success: false, error: 'A source with this name already exists.' }
    return { success: false, error: 'Failed to create source.' }
  }
}

export async function updateSource(sourceId, updateData) {
  try {
    const updatedSource = await Source.findByIdAndUpdate(
      sourceId,
      { $set: updateData },
      { new: true }
    ).lean()
    if (!updatedSource) return { success: false, error: 'Source not found.' }
    return { success: true, source: JSON.parse(JSON.stringify(updatedSource)) }
  } catch (e) {
    return { success: false, error: 'Failed to update source.' }
  }
}

export const getAllCountries = async () => {
  try {
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
    console.error('[getAllCountries Error]', e)
    return { success: false, error: 'Failed to fetch countries.' }
  }
}

export const findSubscribers = async ({ filter = {}, sort = { createdAt: -1 } }) => {
  try {
    const subscribers = await Subscriber.find(filter).sort(sort).lean()
    return { success: true, data: JSON.parse(JSON.stringify(subscribers)) }
  } catch (e) {
    return { success: false, error: 'Failed to find subscribers.' }
  }
}

export const getAllSubscribers = async ({
  page = 1,
  filters = {},
  sort = 'createdAt_desc',
}) => {
  try {
    const { queryFilter, sortOptions } = await buildQuery(Subscriber, { filters, sort })
    const SUBSCRIBERS_PER_PAGE = 50
    const skipAmount = (page - 1) * SUBSCRIBERS_PER_PAGE
    const [subscribers, total] = await Promise.all([
      Subscriber.find(queryFilter)
        .sort(sortOptions)
        .skip(skipAmount)
        .limit(SUBSCRIBERS_PER_PAGE)
        .lean(),
      Subscriber.countDocuments(queryFilter),
    ])
    return { success: true, data: JSON.parse(JSON.stringify(subscribers)), total }
  } catch (e) {
    console.error('[getAllSubscribers Error]', e)
    return { success: false, error: 'Failed to fetch subscribers.' }
  }
}

export const getAllSources = async ({ filter = {}, sort = { name: 1 } }) => {
  try {
    const sources = await Source.find(filter).sort(sort).lean()
    return { success: true, data: JSON.parse(JSON.stringify(sources)) }
  } catch (e) {
    console.error('[getAllSources Error]', e)
    return { success: false, error: 'Failed to fetch sources.' }
  }
}

export const getAllWatchlistEntities = async ({
  page = 1,
  filters = {},
  sort = 'name_asc',
} = {}) => {
  try {
    const { queryFilter, sortOptions } = await buildQuery(WatchlistEntity, {
      filters,
      sort,
    })
    const ITEMS_PER_PAGE = 50
    const skipAmount = (page - 1) * ITEMS_PER_PAGE

    const [entities, total] = await Promise.all([
      WatchlistEntity.find(queryFilter)
        .sort(sortOptions)
        .skip(skipAmount)
        .limit(ITEMS_PER_PAGE)
        .lean(),
      WatchlistEntity.countDocuments(queryFilter),
    ])

    return { success: true, data: JSON.parse(JSON.stringify(entities)), total }
  } catch (e) {
    console.error('[getAllWatchlistEntities Error]', e)
    return { success: false, error: 'Failed to fetch watchlist entities.' }
  }
}

export const getSuggestions = async () => {
  try {
    const [watchlistSuggestions, sourceSuggestions] = await Promise.all([
      WatchlistSuggestion.find({ status: 'candidate' }).sort({ createdAt: -1 }).lean(),
      SourceSuggestion.find({ status: 'pending' }).sort({ createdAt: -1 }).lean(),
    ])
    return { success: true, data: { watchlistSuggestions, sourceSuggestions } }
  } catch (e) {
    console.error('[getSuggestions Error]', e)
    return { success: false, error: 'Failed to fetch suggestions.' }
  }
}