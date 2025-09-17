// packages/auth/src/getCookies.js (version 3.0.0)
'use server'

/**
 * An environment-aware cookie accessor.
 * In a Next.js environment, it dynamically imports and returns the real `cookies()` function.
 * In other environments (like the pipeline), it returns a mock object that
 * safely returns `undefined` to simulate the absence of a request context.
 */
export async function getCookies() {
  if (process.env.IS_PIPELINE_RUN === 'true') {
    // Pipeline environment: return a mock.
    return {
      get: () => undefined,
    };
  } else {
    // Next.js environment: dynamically import and use the real thing.
    const { cookies } = await import('next/headers');
    return cookies();
  }
}
