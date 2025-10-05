// File: apps/client/postcss.config.js (THE FINAL VERSION)
module.exports = {
  plugins: {
    // This tells PostCSS to look for a tailwind.config.js file
    // and process the CSS with it. It should find the one
    // in the same directory.
    'tailwindcss/nesting': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
