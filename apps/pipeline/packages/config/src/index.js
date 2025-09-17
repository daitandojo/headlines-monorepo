// packages/config/src/index.js (version 9.0.0 - Client Safe)
// This is the CLIENT-SAFE entrypoint. It only exports the validated env object.
// It deliberately does NOT export 'settings' or 'initializeSettings' to avoid
// pulling in server-side model dependencies into client bundles.
import { env } from './envSchema.js';

export { env };
