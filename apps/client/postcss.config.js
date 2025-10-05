// File: apps/client/postcss.config.js (DEFINITIVE FIX)
module.exports = {
  plugins: {
    tailwindcss: {
      // This line explicitly tells PostCSS where to find your Tailwind config.
      // The path is relative to this file, which makes it work everywhere.
      config: './tailwind.config.js',
    },
    autoprefixer: {},
  },
}
