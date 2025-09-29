// This file serves as the core, shared module for the scraper-logic package.
// It is environment-agnostic. Environment-specific entry points (next.js, node.js)
// will re-export from this file and add any necessary guards.

// Currently, all exports are handled via subpaths (e.g., /browser, /scraper/index.js).
// If you add a function that should be available from the root of the package,
// export it from here.

// Example of a future export:
// export { someSharedScraperUtil } from './some-util-file.js';
