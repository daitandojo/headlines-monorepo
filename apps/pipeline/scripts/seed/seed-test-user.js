// apps/pipeline/scripts/seed/seed-test-user.js
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { env } from '../../../../packages/config/src/server.js'
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import { Subscriber } from '../../../../packages/models/src/index.js'
import { logger, reinitializeLogger } from '../../../../packages/utils-server'
import path from 'path'

reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))

const TEST_USER_EMAIL = 'casagerardon@gmail.com'
const TEST_USER_PASSWORD = 'Stanley'

async function createTestUser() {
  await dbConnect()
  logger.info(`🚀 Seeding configured test user: ${TEST_USER_EMAIL}...`)

  try {
    const countriesForSubscription = [
      'Norway',
      'United States',
      'Italy',
      'Denmark',
      'Sweden',
      'Global',
      'Scandinavia',
    ]
    const existingUser = await Subscriber.findOne({ email: TEST_USER_EMAIL })

    if (existingUser) {
      logger.warn(
        '🔄 Test user already exists. Ensuring subscriptions and active status are correct...'
      )
      existingUser.isActive = true
      existingUser.emailNotificationsEnabled = true

      const existingCountries = new Set(existingUser.countries.map((c) => c.name))
      countriesForSubscription.forEach((country) => {
        if (!existingCountries.has(country)) {
          existingUser.countries.push({ name: country, active: true })
        }
      })
      await existingUser.save()
      logger.info(
        `✅ User '${TEST_USER_EMAIL}' updated and is subscribed to all necessary countries.`
      )
    } else {
      const newUser = new Subscriber({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        firstName: 'Test',
        lastName: 'Recipient',
        isActive: true,
        emailNotificationsEnabled: true,
        countries: countriesForSubscription.map((name) => ({ name, active: true })),
      })
      await newUser.save()
      logger.info(
        `✅ New test user '${TEST_USER_EMAIL}' created and subscribed to necessary countries.`
      )
    }
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to create or update test user.')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
      logger.info('Disconnected from MongoDB.')
    }
  }
}

createTestUser()
