// apps/client/postcss.config.js (version 2.1.0 - Explicit Path)
const path = require('path')

// This configuration explicitly tells PostCSS where to find the Tailwind config,
// mirroring the robust setup of the working 'admin' application.
// This bypasses any auto-discovery logic that is failing in the monorepo setup.
module.exports = {
  plugins: {
    tailwindcss: {
      config: path.join(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
}
