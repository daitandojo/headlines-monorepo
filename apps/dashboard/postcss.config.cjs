// apps/client/postcss.config.cjs
const path = require('path')

module.exports = {
  plugins: {
    tailwindcss: {
      // It's crucial that this points to the correct file name.
      config: path.join(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
}
