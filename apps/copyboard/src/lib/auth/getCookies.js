'use server'

/**
 * An environment-aware cookie accessor.
 */
export async function getCookies() {
  if (
    process.env.IS_PIPELINE_RUN === 'true' ||
    typeof window !== 'undefined' ||
    !process.env.NEXT_RUNTIME
  ) {
    // Return a mock for non-Next.js server environments or client-side
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
    console.error('Failed to import cookies from next/headers:', error.message)
    // Fallback mock
    return {
      get: () => undefined,
      getAll: () => [],
      has: () => false,
      set: () => {},
      delete: () => {},
    }
  }
}
