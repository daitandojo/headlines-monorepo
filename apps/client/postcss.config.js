// File: apps/client/postcss.config.js (FINAL FIX)
module.exports = {
  plugins: {
    // This tells PostCSS to use the Tailwind CSS plugin and provides the
    // explicit path to its config file. This resolves all ambiguity.
    tailwindcss: require('tailwindcss')('./tailwind.config.js'),
    autoprefixer: {},
  },
}
