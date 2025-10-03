// packages/config/src/index.js (version 4.0.0)
// This file serves as the core, shared module for the config package.
// It validates and exports environment variables and static configuration.
// It also re-exports the new, decoupled settings logic.

import { z } from 'zod'
import { settings, populateSettings } from './settings.js'
import { envSchema } from './envSchema.js'

let validatedEnv = null
function validateAndExportEnv() {
  if (validatedEnv) return validatedEnv
  try {
    validatedEnv = envSchema.parse(process.env)
    return validatedEnv
  } catch (error) {
    console.error('\n❌ CRITICAL: Invalid environment variables found!\n')
    console.error(JSON.stringify(error.flatten().fieldErrors, null, 2))
    console.error('\nHalting application. Please update your .env file.\n')
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1)
    }
    throw new Error('Invalid environment variables')
  }
}
export const env = validateAndExportEnv()

// --- Static and Derived Configs ---
export const IS_REFRESH_MODE = process.env.REFRESH_MODE === 'true'
export const MAX_ARTICLE_CHARS = 30000
export const LLM_CONTEXT_MAX_CHARS = 25000
export const MIN_HEADLINE_CHARS = 5
export const MAX_HEADLINE_CHARS = 500
export const AI_BATCH_SIZE = 6

export const SMTP_CONFIG = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  fromAddress: env.SMTP_FROM_ADDRESS || env.SMTP_USER,
  fromName: env.SMTP_FROM_NAME,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 10,
}

export const EMAIL_CONFIG = {
  templateName: 'wealthEvents',
  subject: 'New Nordic Banking Opportunities Detected',
  language: 'en',
  brandName: 'Your Wealth Watch',
  companyAddress: 'Wealth Watch Inc., Paris, France',
  unsubscribeUrl: '#',
}

export const SUPERVISOR_EMAIL_CONFIG = {
  templateName: 'supervisorReport',
  subject: '⚙️ Hourly Headlines Processing Run Summary',
  language: 'en',
  brandName: 'Headlines Processing Bot',
}

// Re-export the new settings logic.
export { settings, populateSettings }
