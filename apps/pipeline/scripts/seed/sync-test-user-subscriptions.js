// apps/pipeline/scripts/seed/sync-test-user-subscriptions.js
import { initializeScriptEnv } from './lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import {
  findSubscribers,
  getAllCountries,
  updateSubscriber,
} from '@headlines/data-access'

const TEST_USER_EMAIL = 'casagerardon@gmail.com'

async function syncUserSubscriptions() {
  await initializeScriptEnv()
  logger.info(`🚀 Syncing subscriptions for test user: ${TEST_USER_EMAIL}...`)

  try {
    const userResult = await findSubscribers({ filter: { email: TEST_USER_EMAIL } })
    if (!userResult.success || userResult.data.length === 0) {
      logger.error(
        `❌ User with email '${TEST_USER_EMAIL}' not found. Please run the 'db:seed:test-user' script first.`
      )
      return
    }
    const user = userResult.data[0]

    const countriesResult = await getAllCountries()
    if (!countriesResult.success) throw new Error(countriesResult.error)
    const activeCountries = countriesResult.data.filter((c) => c.status === 'active')

    if (activeCountries.length === 0) {
      logger.warn('⚠️ No active countries found in the database.')
      return
    }

    const updateResult = await updateSubscriber(user._id, {
      countries: activeCountries.map((c) => ({ name: c.name, active: true })),
    })

    if (!updateResult.success) throw new Error(updateResult.error)

    logger.info(
      `✅ User '${TEST_USER_EMAIL}' is now subscribed to all ${activeCountries.length} active countries.`
    )
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to sync user subscriptions.')
  }
}

syncUserSubscriptions()
