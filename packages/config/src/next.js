    
// packages/config/src/next.js
import 'server-only'

// Explicitly re-export every constant and function from the shared core file.
// This is the most robust way to ensure Next.js's bundler correctly handles
// the module while respecting the 'server-only' directive.
export {
  env,
  settings,
  populateSettings, // CORRECTED: Export the new function name
  IS_REFRESH_MODE,
  MAX_ARTICLE_CHARS,
  LLM_CONTEXT_MAX_CHARS,
  MIN_HEADLINE_CHARS,
  MAX_HEADLINE_CHARS,
  AI_BATCH_SIZE,
  SMTP_CONFIG,
  EMAIL_CONFIG,
  SUPERVISOR_EMAIL_CONFIG,
} from './index.js'

  