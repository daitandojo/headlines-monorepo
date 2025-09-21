// packages/data-access/src/index.js (version 2.4.2 - Complete)
// This is the single, server-only entry point for the data-access package.
export * from './actions/articles.js'
export * from './actions/events.js'
export * from './actions/opportunities.js'
export * from './actions/auth.js'
export * from './actions/chat.js'
export * from './actions/dashboard.js'
export * from './actions/email.js'
export * from './actions/export.js'
export * from './actions/extract.js'
export * from './actions/knowledge.js'
export * from './actions/pipeline.js'
export * from './actions/relationships.js'
export * from './actions/scrape.js'
export * from './actions/upload.js'
export * from './actions/userSettings.js'
export * from './actions/verdicts.js'
export * from './actions/admin.js'
export * from './actions/watchlist.js'
export * from './actions/settings.js'
export * from './actions/subscriber.js'

import {
  Country,
  Subscriber,
  Source,
  WatchlistEntity,
  WatchlistSuggestion,
  SourceSuggestion,
} from '@headlines/models'

export const getAllCountries = async () => {
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
}

export const getAllSubscribers = async () => ({
  success: true,
  data: await Subscriber.find({}).sort({ createdAt: -1 }).lean(),
})
export const getAllSources = async () => ({
  success: true,
  data: await Source.find({}).sort({ country: 1, name: 1 }).lean(),
})
export const getAllWatchlistEntities = async () => ({
  success: true,
  data: await WatchlistEntity.find({}).sort({ name: 1 }).lean(),
})
export const getSuggestions = async () => {
  const [watchlistSuggestions, sourceSuggestions] = await Promise.all([
    WatchlistSuggestion.find({ status: 'candidate' }).sort({ createdAt: -1 }).lean(),
    SourceSuggestion.find({ status: 'pending' }).sort({ createdAt: -1 }).lean(),
  ])
  return { success: true, data: { watchlistSuggestions, sourceSuggestions } }
}
