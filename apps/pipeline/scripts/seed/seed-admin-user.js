// apps/pipeline/scripts/seed/seed-admin-user.js (version 4.0.0 - Model-driven)
import {
  reinitializeLogger as initializeLogger,
  logger,
} from '../../../../packages/utils-server'
import path from 'path'
import { Subscriber, Country } from '../../../../packages/models/src/index.js'
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import mongoose from 'mongoose'

initializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin'

async function seedAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    logger.fatal('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in your .env file.')
    return
  }

  await dbConnect()
  logger.info(`🚀 Seeding Admin User: ${ADMIN_EMAIL}...`)
  try {
    const existingUser = await Subscriber.findOne({ email: ADMIN_EMAIL })
    const allCountries = await Country.find({ status: 'active' }).select('name').lean()
    const countrySubscriptions = allCountries.map((c) => ({ name: c.name, active: true }))

    if (existingUser) {
      logger.warn(
        'Admin user already exists. Overwriting password and ensuring settings are correct.'
      )
      existingUser.password = ADMIN_PASSWORD // The pre-save hook will hash this
      await existingUser.save()
      logger.info(`✅ Admin user password has been reset and saved.`)
    } else {
      const newUser = new Subscriber({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD, // The pre-save hook will hash this
        firstName: ADMIN_FIRST_NAME,
        role: 'admin',
        isActive: true,
        countries: countrySubscriptions,
        subscriptionTier: 'enterprise',
        isLifetimeFree: true,
      })
      await newUser.save()
      logger.info(`✅ Admin user created successfully.`)
    }
  } catch (error) {
    logger.fatal({ err: error }, '❌ Admin user seeding failed.')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

seedAdminUser()
