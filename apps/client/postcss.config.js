// File: apps/client/postcss.config.js (FINAL, ABSOLUTE PATH FIX)

// Use Node's built-in `path` module to construct absolute paths
const path = require('path')

module.exports = {
  plugins: {
    // Explicitly resolve the path to the tailwindcss module from the monorepo root
    // and then provide the path to this package's tailwind.config.js
    tailwindcss: {
      config: path.resolve(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
}
