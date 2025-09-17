// apps/admin/tailwind.config.js (version 6.1.0 - Consistent Relative Paths)
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('../../packages/ui/tailwind.preset.cjs')],
  // DEFINITIVE FIX: The content paths are now relative to this config file's
  // location, matching the corrected client app config for consistency.
  content: [
    './src/**/*.{js,jsx}', // Scans the admin app's own source files.
    '../../packages/ui/src/**/*.{js,jsx}', // Scans the shared UI package.
  ],
}
