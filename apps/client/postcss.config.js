// apps/client/postcss.config.cjs
const path = require('path')

module.exports = {
  plugins: {
    [require.resolve('tailwindcss')]: {
      config: path.join(__dirname, 'tailwind.config.js'),
    },
    [require.resolve('autoprefixer')]: {},
  },
}