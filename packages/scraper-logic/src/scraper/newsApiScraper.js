// packages/scraper-logic/src/scraper/newsApiScraper.js (version 2.3.0)
import NewsAPI from 'newsapi'
import { getConfig } from '../config.js';
import { Source, WatchlistEntity } from '@headlines/models'
import { env } from '@headlines/config'
import colors from 'ansi-colors';

async function getWatchlist() {
  const [sources, richListTargets] = await Promise.all([
    Source.find({
      status: 'active',
      country: { $in: ['Denmark', 'Global PE', 'M&A Aggregators'] },
    })
      .select('name')
      .lean(),
    WatchlistEntity.find({ status: 'active' }).select('name').lean(),
  ])

  const sourceNames = sources.map((s) => s.name.split('(')[0].trim())
  const richListNames = richListTargets.map((t) => t.name.split('(')[0].trim())
  const watchlist = [...new Set([...sourceNames, ...richListNames])]
  getConfig().logger.trace({ details: watchlist }, 'Full NewsAPI watchlist keywords.')
  return watchlist
}

function buildQueryBatches(watchlist) {
  const MAX_QUERY_LENGTH = 490
  const queries = []
  let currentBatch = []

  for (const keyword of watchlist) {
    const sanitizedKeyword = keyword.replace(/&/g, ' ').replace(/[()]/g, '').trim()
    if (!sanitizedKeyword) continue
    const quotedKeyword = `"${sanitizedKeyword}"`
    const potentialQuery = [...currentBatch, quotedKeyword].join(' OR ')
    if (potentialQuery.length > MAX_QUERY_LENGTH) {
      if (currentBatch.length > 0) {
        queries.push(currentBatch.join(' OR '))
      }
      currentBatch = [quotedKeyword]
    } else {
      currentBatch.push(quotedKeyword)
    }
  }

  if (currentBatch.length > 0) {
    queries.push(currentBatch.join(' OR '))
  }

  const queriesToUse = queries.slice(0, 4);

  if (queries.length > 4) {
    getConfig().logger.warn(
      `[NewsAPI] Watchlist generated ${queries.length} queries, but will only use the first 4 to avoid rate limits.`
    );
    let logMessage = '[NewsAPI] Generated Queries:\n';
    queries.forEach((q, i) => {
        const inUse = i < 4;
        logMessage += inUse ? colors.green(`  [IN USE] Query ${i+1}: ${q}\n`) : colors.gray(`  [SKIPPED] Query ${i+1}: ${q}\n`);
    });
    getConfig().logger.info(logMessage);
  }

  return queriesToUse;
}

export async function scrapeNewsAPI() {
  const newsapi = new NewsAPI(env.NEWSAPI_API_KEY)
  try {
    const watchlist = await getWatchlist()
    const queryBatches = buildQueryBatches(watchlist)

    getConfig().logger.info(
      `📰 [NewsAPI] Dispatching ${queryBatches.length} batched queries to cover the watchlist.`
    )

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const allPromises = queryBatches.map((query) =>
      newsapi.v2.everything({
        q: query,
        language: 'en,da,sv,no',
        sortBy: 'publishedAt',
        from: twentyFourHoursAgo,
        pageSize: 100,
      })
    )

    const allResponses = await Promise.all(allPromises)
    let allArticles = []

    for (const response of allResponses) {
      if (response.status !== 'ok') {
        getConfig().logger.error(
          `[NewsAPI] Error in a batch query: ${response.code} - ${response.message}`
        )
        continue
      }
      allArticles.push(...response.articles)
    }

    if (allArticles.length === 0) {
      getConfig().logger.info('[NewsAPI] Found no new articles matching the watchlist.')
      return []
    }

    getConfig().logger.info(
      `[NewsAPI] Found a total of ${allArticles.length} potential articles across all batches.`
    )

    const articles = allArticles.map((a) => ({
      headline: a.title,
      link: a.url,
      source: a.source.name,
      newspaper: a.source.name,
    }))

    return Array.from(new Map(articles.map((a) => [a.link, a])).values())
  } catch (error) {
    if (error.name?.includes('rateLimited')) {
      getConfig().logger.warn(
        '[NewsAPI] Rate limit hit, as expected on developer plan. Some watchlist items may have been missed.'
      )
    } else {
      getConfig().logger.error(
        { err: error },
        '[NewsAPI] A critical error occurred during batched scraping.'
      )
    }
    return []
  }
}
