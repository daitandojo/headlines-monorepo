// packages/scraper-logic/src/index.js (version 2.0.1)
import 'server-only'

// This file serves as the public API for our shared scraper logic package.
// By adding 'server-only', we ensure this package and its dependencies (like Playwright)
// can never be accidentally bundled into client-side code. This is the poison pill
// that enforces our architectural separation.
