// apps/pipeline/scripts/seed/sync-test-user-subscriptions.js
import mongoose from 'mongoose'
import { env } from '../../../../packages/config/src/server.js'
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import { Subscriber, Country } from '../../../../packages/models/src/index.js'
import { logger, reinitializeLogger } from '../../../../packages/utils-server'
import path from 'path'

reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))

const TEST_USER_EMAIL = 'casagerardon@gmail.com'

async function syncUserSubscriptions() {
  await dbConnect()
  logger.info(`🚀 Syncing subscriptions for test user: ${TEST_USER_EMAIL}...`)

  try {
    const user = await Subscriber.findOne({ email: TEST_USER_EMAIL })

    if (!user) {
      logger.error(
        `❌ User with email '${TEST_USER_EMAIL}' not found. Please run the 'db:seed:test-user' script first.`
      )
      return
    }

    const activeCountries = await Country.find({ status: 'active' }).select('name').lean()
    if (activeCountries.length === 0) {
      logger.warn('⚠️ No active countries found in the database.')
      return
    }

    const activeCountryNames = activeCountries.map((c) => c.name)
    user.countries = activeCountryNames.map((name) => ({ name, active: true }))

    await user.save()
    logger.info(
      `✅ User '${TEST_USER_EMAIL}' is now subscribed to all ${activeCountryNames.length} active countries.`
    )
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to sync user subscriptions.')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
      logger.info('Disconnected from MongoDB.')
    }
  }
}

syncUserSubscriptions()
