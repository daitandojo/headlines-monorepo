// packages/data-access/src/revalidate.js
/**
 * An environment-aware revalidation function.
 * This function is now async to handle the dynamic import safely.
 * @param {string} path - The path to revalidate.
 * @param {('layout'|'page')} [type] - The type of revalidation.
 */
export async function revalidatePath(path, type) {
  // In the pipeline environment, this function is a no-op.
  if (process.env.IS_PIPELINE_RUN === 'true') {
    return
  }

  try {
    // This dynamic import will only succeed in a Next.js environment.
    const { revalidatePath: nextRevalidate } = await import('next/cache')
    return nextRevalidate(path, type)
  } catch (e) {
    // This catch block handles cases where it might be run in an unexpected env.
    console.log('[data-access] Failed to import next/cache. Revalidation skipped.')
  }
}
