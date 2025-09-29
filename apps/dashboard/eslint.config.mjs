// Full Path: headlines/apps/dashboard/eslint.config.mjs
import eslintConfigNext from 'eslint-config-next'

// This is the modern, correct way to configure ESLint with Next.js
// in a flat config file (`eslint.config.mjs`). The older `.eslintrc.json`
// format can cause build "renderer confusion", leading to the exact error
// you are seeing, even when layouts are correct.
export default [
  eslintConfigNext,
  // You can add custom rules here if needed.
]
