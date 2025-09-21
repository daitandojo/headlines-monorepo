/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use the shared preset from the UI package for a consistent theme foundation.
  presets: [require('../../packages/ui/tailwind.preset.cjs')],

  // The 'content' paths are relative to the MONOREPO ROOT. This ensures that
  // when the Tailwind compiler runs, it can correctly locate all source files
  // that contain Tailwind classes from both this app and the shared UI package.
  content: ['./src/**/*.{js,jsx}', '../../packages/ui/src/**/*.{js,jsx}'],
}
