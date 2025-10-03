// apps/pipeline/scripts/seed/seed-admin-user.js
import { logger } from '@headlines/utils-shared'
import {
  createSubscriberWithPassword,
  updateSubscriber,
  updateSubscriberPassword,
  getAllCountries,
  findSubscribers,
} from '@headlines/data-access'
import { initializeScriptEnv } from './lib/script-init.js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin'

async function seedAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    logger.fatal('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in your .env file.')
    return
  }

  await initializeScriptEnv()
  logger.info(`🚀 Seeding Admin User: ${ADMIN_EMAIL}...`)
  try {
    const countriesResult = await getAllCountries()
    if (!countriesResult.success) throw new Error('Could not fetch countries.')
    const countrySubscriptions = countriesResult.data
      .filter((c) => c.status === 'active')
      .map((c) => ({ name: c.name, active: true }))

    const findResult = await findSubscribers({ filter: { email: ADMIN_EMAIL } })
    const existingUser =
      findResult.success && findResult.data.length > 0 ? findResult.data[0] : null

    if (existingUser) {
      logger.warn(
        'Admin user already exists. Overwriting password and ensuring settings are correct.'
      )
      const passwordResult = await updateSubscriberPassword(
        existingUser._id,
        ADMIN_PASSWORD
      )
      if (!passwordResult.success) throw new Error(passwordResult.error)

      // Update other fields separately
      await updateSubscriber(existingUser._id, {
        firstName: ADMIN_FIRST_NAME,
        role: 'admin',
        isActive: true,
        countries: countrySubscriptions,
        subscriptionTier: 'enterprise',
        isLifetimeFree: true,
      })

      logger.info(`✅ Admin user password has been reset and settings updated.`)
    } else {
      const adminData = {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        firstName: ADMIN_FIRST_NAME,
        role: 'admin',
        isActive: true,
        countries: countrySubscriptions,
        subscriptionTier: 'enterprise',
        isLifetimeFree: true,
      }
      const createResult = await createSubscriberWithPassword(adminData)
      if (!createResult.success) throw new Error(createResult.error)
      logger.info(`✅ Admin user created successfully.`)
    }
  } catch (error) {
    logger.fatal({ err: error }, '❌ Admin user seeding failed.')
  }
}

seedAdminUser()
