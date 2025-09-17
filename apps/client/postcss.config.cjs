// apps/client/postcss.config.cjs (version 2.2.0 - Final CJS Naming)
const path = require('path')

// This configuration explicitly tells PostCSS where to find the Tailwind config.
// The .cjs extension is critical to ensure it's treated as a CommonJS module.
module.exports = {
  plugins: {
    tailwindcss: {
      config: path.join(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
}
