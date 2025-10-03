// packages/utils-server/src/next.js
import 'server-only'

// This file exports the absolute minimum set of utilities required by the
// Next.js application's server-side code.

// The shared logger is now imported directly from @headlines/utils-shared where needed.

// Import ONLY the needed functions from the safe helpers shim
import { safeExecute } from './helpers-next.js'

// Import and re-export the alerting utility
import { sendErrorAlert } from './alerting.js'

// EXPLICITLY export ONLY the safe functions.
export { safeExecute, sendErrorAlert }
