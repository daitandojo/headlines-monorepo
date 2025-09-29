// packages/config/src/pipeline.js (NEW FILE)
// This file is IDENTICAL to server.js but WITHOUT the 'server-only' import.
// It is intended ONLY for use by the pipeline script.

import { z } from 'zod'
import { settings, initializeSettings } from './settings.js'

// --- Environment Schema and Validation ---
const stringToBoolean = z
  .string()
  .transform((val) => val === 'true')
  .or(z.boolean())
const stringToNumber = z.string().transform((val) => parseInt(val, 10))

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  MONGO_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CONCURRENCY_LIMIT: stringToNumber.default('3'),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_INDEX_NAME: z.string().min(1).default('headlines'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: stringToNumber,
  SMTP_SECURE: stringToBoolean,
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM_ADDRESS: z.string().email(),
  SMTP_FROM_NAME: z.string().min(1).default('Headlines AI'),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().startsWith('mailto:'),
  NEXT_PUBLIC_PUSHER_KEY: z.string().min(1),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1),
  PUSHER_APP_ID: z.string().min(1),
  PUSHER_KEY: z.string().min(1),
  PUSHER_SECRET: z.string().min(1),
  PUSHER_CLUSTER: z.string().min(1),
  GROQ_API_KEY: z.string().startsWith('gsk_').optional(),
  SERPER_API_KEY: z.string().min(1).optional(),
  NEWSAPI_API_KEY: z.string().min(1),
})

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

export { settings, initializeSettings }
