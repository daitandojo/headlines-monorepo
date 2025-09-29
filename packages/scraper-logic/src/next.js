import 'server-only'

// Explicitly re-export everything from the core module
// Since this package's index doesn't export much, we list them here.
// Note: The main value is guarding the side-effects of importing its dependencies.
// If core.js exports functions, they would be listed here.
// For now, it might be empty if core.js is empty, which is fine.
export * from './core.js'
