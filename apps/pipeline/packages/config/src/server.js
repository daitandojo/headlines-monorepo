// packages/config/src/server.js (version 1.0.0)
// This file is the server-only entrypoint for the config package.
import { env } from './envSchema.js';
import { settings, initializeSettings } from './settings.js';

export { env, settings, initializeSettings };
