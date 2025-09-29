// File: apps/copyboard/app.config.js

// This file provides the minimal configuration needed by the shared
// packages when they're used by the app's API routes.

export const CONCURRENCY_LIMIT = 2;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const LLM_MODEL_UTILITY = process.env.LLM_MODEL_UTILITY || 'gpt-5-nano';