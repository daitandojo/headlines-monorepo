// packages/ai-services/src/lib/promptBuilder.js
import { settings } from '@headlines/config'

/**
 * A robust, centralized function to build a string prompt from an instruction object.
 * It handles instruction objects, functions that return objects, and plain strings.
 * @param {object|Function|string} instruction - The prompt instruction object or function.
 * @returns {string} The fully constructed prompt string.
 */
export function buildPrompt(instruction) {
  let promptSource = instruction

  // If the prompt is a function, execute it to get the object.
  if (typeof promptSource === 'function') {
    promptSource = promptSource(settings)
  }

  // If the result is an object, automatically build the string.
  if (typeof promptSource === 'object' && promptSource !== null) {
    return Object.values(promptSource)
      .flat() // Seamlessly handles both 'string' and ['array', 'of', 'strings']
      .filter((value) => typeof value === 'string')
      .join('\n\n')
  }

  // If it's already a string, use it directly.
  if (typeof promptSource === 'string') {
    return promptSource
  }

  throw new Error(
    'buildPrompt received an invalid instruction type. Must be an object, function, or string.'
  )
}
