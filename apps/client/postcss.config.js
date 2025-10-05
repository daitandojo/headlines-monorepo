// File: apps/client/postcss.config.js (FINAL MONOREPO-AWARE FIX)
module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': {},
    // Pass the absolute path to the tailwind.config.js file
    tailwindcss: { config: './tailwind.config.js' },
    autoprefixer: {},
  },
}
