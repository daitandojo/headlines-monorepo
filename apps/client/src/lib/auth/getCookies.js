// apps/client/src/lib/auth/getCookies.js
'use server'
import { logger } from '@headlines/utils-shared'

/**
 * An environment-aware cookie accessor.
 */
export async function getCookies() {
  if (
    process.env.IS_PIPELINE_RUN === 'true' ||
    typeof window !== 'undefined' ||
    !process.env.NEXT_RUNTIME
  ) {
    return {
      get: () => undefined,
      getAll: () => [],
      has: () => false,
      set: () => {},
      delete: () => {},
    }
  }
  try {
    const { cookies } = await import('next/headers')
    return cookies()
  } catch (error) {
    logger.error({ err: error }, 'Failed to import cookies from next/headers.')
    return {
      get: () => undefined,
      getAll: () => [],
      has: () => false,
      set: () => {},
      delete: () => {},
    }
  }
}
