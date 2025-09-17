// apps/pipeline/scripts/seed/lib/user-interact.js
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

/**
 * Prompts the user for a y/n/a response.
 * @param {string} query - The question to ask the user.
 * @returns {Promise<string>} - A promise that resolves to 'y', 'n', or 'a'.
 */
export function promptUser(query) {
  return new Promise((resolve) => {
    const ask = () => {
      // Use a small timeout to allow any buffered logger output to flush first.
      setTimeout(() => {
        // Clear the current line and move cursor to the beginning before asking.
        readline.clearLine(process.stdout, 0)
        readline.cursorTo(process.stdout, 0)

        rl.question(query, (answer) => {
          const response = answer.trim().toLowerCase()
          if (['y', 'n', 'a'].includes(response)) {
            resolve(response)
          } else {
            console.log('Invalid input. Please enter "y", "n", or "a".')
            ask()
          }
        })
      }, 100) // 100ms delay is usually sufficient.
    }
    ask()
  })
}

/**
 * Closes the readline interface. Should be called when the script is finished.
 */
export function closeReader() {
  rl.close()
}
