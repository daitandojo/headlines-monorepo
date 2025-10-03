// apps/pipeline/scripts/seed/seed-test-user.js
import { initializeScriptEnv } from './lib/script-init.js'
import { logger, sendErrorAlert } from '@headlines/utils-server'
import {
  upsertSubscriber,
  findSubscribers,
  createSubscriberWithPassword,
  updateSubscriberPassword,
} from '@headlines/data-access'

const TEST_USER_EMAIL = 'casagerardon@gmail.com'
const TEST_USER_PASSWORD = 'Stanley'

async function createTestUser() {
  try {
    await initializeScriptEnv()
    logger.info(`🚀 Seeding configured test user: ${TEST_USER_EMAIL}...`)

    const countriesForSubscription = [
      'Norway',
      'United States',
      'Italy',
      'Denmark',
      'Sweden',
      'Global',
      'Scandinavia',
    ]

    const findResult = await findSubscribers({ filter: { email: TEST_USER_EMAIL } })
    const existingUser =
      findResult.success && findResult.data.length > 0 ? findResult.data[0] : null

    if (existingUser) {
      logger.warn(
        '🔄 Test user already exists. Ensuring subscriptions and active status are correct...'
      )
      await updateSubscriberPassword(existingUser._id, TEST_USER_PASSWORD)
      const updateResult = await upsertSubscriber(
        { email: TEST_USER_EMAIL },
        {
          isActive: true,
          emailNotificationsEnabled: true,
          countries: countriesForSubscription.map((name) => ({ name, active: true })),
        }
      )
      if (!updateResult.success) throw new Error(updateResult.error)

      logger.info(
        `✅ User '${TEST_USER_EMAIL}' updated and is subscribed to all necessary countries.`
      )
    } else {
      const newUser = {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        firstName: 'Test',
        lastName: 'Recipient',
        isActive: true,
        emailNotificationsEnabled: true,
        countries: countriesForSubscription.map((name) => ({ name, active: true })),
      }
      const createResult = await createSubscriberWithPassword(newUser)
      if (!createResult.success) throw new Error(createResult.error)

      logger.info(
        `✅ New test user '${TEST_USER_EMAIL}' created and subscribed to necessary countries.`
      )
    }
  } catch (error) {
    sendErrorAlert(error, { origin: 'SEED_TEST_USER_SCRIPT' })
    logger.fatal({ err: error }, '❌ Failed to create or update test user.')
  }
}

createTestUser()
