// apps/admin/tailwind.config.js (version 6.0.0 - Monorepo Root Relative)
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use the shared preset from the UI package for a consistent theme.
  presets: [require('../../packages/ui/tailwind.preset.cjs')],

  // The 'content' paths must be relative to the MONOREPO ROOT,
  // not the current file. This ensures that when the Tailwind
  // compiler runs from the root, it can correctly locate all
  // source files that contain Tailwind classes. This is the
  // definitive fix for CSS not loading in a monorepo setup.
  content: [
    './apps/admin/src/**/*.{js,jsx}',
    './packages/ui/src/**/*.{js,jsx}',
  ],
}