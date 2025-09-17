// check-env.mjs (version 1.0)
import fs from 'fs'
import path from 'path'

/**
 * This script is a pre-flight check to ensure the fundamental environment is correct.
 * It verifies that the .env.local file exists in the directory where the 'npm run dev'
 * command is being executed. If it doesn't, it halts the process with a clear error.
 */
function checkEnvironment() {
  const cwd = process.cwd()
  console.log('\x1b[36m%s\x1b[0m', '[ENV CHECK] Current Working Directory:', cwd)

  const envPath = path.join(cwd, '.env.local')
  console.log('\x1b[36m%s\x1b[0m', '[ENV CHECK] Searching for .env.local at:', envPath)

  if (fs.existsSync(envPath)) {
    console.log('\x1b[32m%s\x1b[0m', '[ENV CHECK] SUCCESS: .env.local file found.')
  } else {
    console.error(
      '\x1b[31m%s\x1b[0m',
      '[ENV CHECK] CRITICAL FAILURE: .env.local file not found.'
    )
    console.error(
      '\x1b[31m%s\x1b[0m',
      "[ENV CHECK] Ensure you are running 'npm run dev' from the project's root directory."
    )
    process.exit(1) // Halt the build process
  }
}

checkEnvironment()
