// apps/client/src/lib/actions/createAdminAction.js
'use server'

import dbConnect from '@headlines/data-access/dbConnect/next'
import { revalidatePath } from 'next/cache'

/**
 * A higher-order function that creates a server action.
 * It handles database connection, core logic execution, path revalidation, and error handling.
 * @param {Function} coreAction The core data-access function to execute.
 * @param {string} [revalidationPath] The Next.js path to revalidate on success.
 * @returns {Function} An async function that serves as the server action.
 */
export function createAdminAction(coreAction, revalidationPath) {
  return async (...args) => {
    try {
      await dbConnect()
      const result = await coreAction(...args)
      if (result.success && revalidationPath) {
        revalidatePath(revalidationPath)
      }
      return result
    } catch (error) {
      console.error(`[AdminAction Error] in ${coreAction.name}:`, error)
      // Return a consistent error shape for the client
      return {
        success: false,
        error: error.message || 'An unexpected server error occurred.',
      }
    }
  }
}
