// scripts/tools/get-db-stats.js (version 1.0)
import 'dotenv/config'
import { connectDatabase, disconnectDatabase } from '../../../src/database.js'
import Article from '../../../models/Article.js'
import SynthesizedEvent from '../../../models/SynthesizedEvent.js'
import Opportunity from '../../../models/Opportunity.js'
import WatchlistEntity from '../../../models/WatchlistEntity.js'
import Source from '../../../models/Source.js'
import Subscriber from '../../../models/Subscriber.js'

async function getStats() {
  await connectDatabase()
  try {
    console.log('\n--- 📊 Database Statistics ---')
    const [
      articles,
      events,
      opportunities,
      watchlist,
      sources,
      subscribers,
    ] = await Promise.all([
      Article.countDocuments(),
      SynthesizedEvent.countDocuments(),
      Opportunity.countDocuments(),
      WatchlistEntity.countDocuments({ status: 'active' }),
      Source.countDocuments({ status: 'active' }),
      Subscriber.countDocuments({ isActive: true }),
    ])

    console.table({
      'Active Sources': sources,
      'Active Watchlist Entities': watchlist,
      'Total Articles': articles,
      'Total Synthesized Events': events,
      'Total Opportunities': opportunities,
      'Active Subscribers': subscribers,
    })
  } catch (error) {
    console.error('Failed to fetch database stats:', error)
  } finally {
    await disconnectDatabase()
  }
}

getStats()