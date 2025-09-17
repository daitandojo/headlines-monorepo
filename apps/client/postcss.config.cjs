// apps/client/postcss.config.cjs (version 2.1.0 - CJS Naming Fix)
const path = require('path')

// This configuration explicitly tells PostCSS where to find the Tailwind config.
// This bypasses any auto-discovery logic that is failing in the monorepo setup.
module.exports = {
  plugins: {
    tailwindcss: {
      config: path.join(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
}
