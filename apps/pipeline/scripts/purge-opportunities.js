// scripts/purge-opportunities.js (version 1.0)
import 'dotenv/config'
import { connectDatabase, disconnectDatabase } from '../src/database.js'
import Opportunity from '../models/Opportunity.js'

const WEALTH_THRESHOLD = 20 // in millions USD

async function purgeLowValueOpportunities() {
  console.log('Connecting to database to purge low-value opportunities...')
  await connectDatabase()

  try {
    const filter = {
      $or: [
        { likelyMMDollarWealth: { $lt: WEALTH_THRESHOLD } },
        { likelyMMDollarWealth: { $exists: false } },
        { likelyMMDollarWealth: null },
      ],
    }

    console.log(
      `Searching for opportunities with less than $${WEALTH_THRESHOLD}M in estimated wealth or no wealth amount specified...`
    )

    const count = await Opportunity.countDocuments(filter)

    if (count === 0) {
      console.log('✅ No low-value opportunities found to purge. Database is clean.')
      return
    }

    console.log(`Found ${count} opportunities to purge. Proceeding with deletion...`)

    const result = await Opportunity.deleteMany(filter)

    console.log(`✅ Successfully purged ${result.deletedCount} low-value opportunities.`)
  } catch (error) {
    console.error('❌ An error occurred during the purge process:')
    console.error(error)
  } finally {
    await disconnectDatabase()
    console.log('Database connection closed.')
  }
}

purgeLowValueOpportunities()
