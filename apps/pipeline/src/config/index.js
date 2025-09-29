// apps/pipeline/src/config/index.js (version 6.0.0)
// Use the server-safe entrypoint for all config imports in the pipeline
import { env, settings } from '@headlines/config'

// --- Re-export all shared env and settings for local pipeline use ---
export * from '@headlines/config'

// --- App-Specific Static Constants (Not dynamically configurable) ---
export const IS_REFRESH_MODE = process.env.REFRESH_MODE === 'true'

// --- Static Thresholds (less likely to be changed by admin) ---
export const MAX_ARTICLE_CHARS = 30000
export const LLM_CONTEXT_MAX_CHARS = 25000
export const MIN_HEADLINE_CHARS = 5
export const MAX_HEADLINE_CHARS = 500
export const AI_BATCH_SIZE = 6

// --- Re-export SMTP and Email configs from env for convenience ---
export const SMTP_CONFIG = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
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
