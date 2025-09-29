// src/lib/env.mjs (version 3.1)
import { z } from 'zod'

/**
 * Defines the schema for all required server-side environment variables.
 * This schema is used to parse `process.env` and ensures that all necessary
 * variables are present and correctly formatted at application startup.
 */
const envSchema = z.object({
  // Core Infrastructure
  MONGO_URI: z.string().url({ message: 'MONGO_URI must be a valid URL.' }),

  // Authentication
  COOKIE_SECRET: z
    .string()
    .min(10, { message: 'COOKIE_SECRET must be at least 10 characters long.' }), // Note: This will be deprecated
  JWT_SECRET: z
    .string()
    .min(32, { message: 'JWT_SECRET must be at least 32 characters long for security.' }),

  // Third-Party Services
  GROQ_API_KEY: z.string().min(1, { message: 'GROQ_API_KEY is required.' }),
  SERPAPI_API_KEY: z.string().min(1, { message: 'SERPAPI_API_KEY is required.' }),
  PINECONE_API_KEY: z.string().min(1, { message: 'PINECONE_API_KEY is required.' }),
  PINECONE_INDEX_NAME: z.string().min(1, { message: 'PINECONE_INDEX_NAME is required.' }),

  // Pusher (Real-time) - These are public, so they need the NEXT_PUBLIC_ prefix
  NEXT_PUBLIC_PUSHER_KEY: z
    .string()
    .min(1, { message: 'NEXT_PUBLIC_PUSHER_KEY is required.' }),
  NEXT_PUBLIC_PUSHER_CLUSTER: z
    .string()
    .min(1, { message: 'NEXT_PUBLIC_PUSHER_CLUSTER is required.' }),

  // Push Notifications (PWA)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z
    .string()
    .min(1, { message: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is required.' }),
  VAPID_PRIVATE_KEY: z.string().min(1, { message: 'VAPID_PRIVATE_KEY is required.' }),
  VAPID_SUBJECT: z.preprocess(
    (val) => (typeof val === 'string' ? val.replace(/^mailto:/, '') : val),
    z.string().email({
      message: 'VAPID_SUBJECT must be a valid email address (e.g., contact@example.com).',
    })
  ),
})

let env

try {
  env = envSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    let errorMessage =
      '\n\n\x1b[31mCRITICAL ERROR: Invalid or missing environment variables:\x1b[0m\n'
    error.errors.forEach((e) => {
      errorMessage += `  - \x1b[33m${e.path.join('.')}:\x1b[0m \x1b[31m${e.message}\x1b[0m\n`
    })
    errorMessage +=
      '\n\x1b[32mACTION REQUIRED: Please check your .env.local file and ensure all required variables are set correctly.\x1b[0m\n'

    // START: REPLACED process.exit WITH A THROWN ERROR
    // This stops the build/server start in a runtime-agnostic way.
    throw new Error(errorMessage)
    // END: REPLACED process.exit
  }
  // Re-throw other unexpected errors
  throw error
}

export { env }
