import { z } from 'zod'

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
