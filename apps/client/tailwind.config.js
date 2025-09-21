/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use the shared preset from the UI package for a consistent theme foundation.
  presets: [require('../../packages/ui/tailwind.preset.cjs')],

  // The 'content' paths are relative to the MONOREPO ROOT. This ensures that
  // when the Tailwind compiler runs, it can correctly locate all source files
  // that contain Tailwind classes from both this app and the shared UI package.
  content: ['./src/**/*.{js,jsx}', '../../packages/ui/src/**/*.{js,jsx}'],

  // Theme extensions specific to the client application.
  theme: {
    extend: {
      fontFamily: {
        serif: ['Merriweather', 'serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
        pulse: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.7, transform: 'scale(0.95)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        shake: 'shake 0.5s ease-in-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
