// This configuration uses a function-based array for plugins,
// which is more explicit and robust for module resolution.
module.exports = {
  plugins: [require('tailwindcss'), require('autoprefixer')],
}
