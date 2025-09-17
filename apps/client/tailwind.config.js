// tailwind.config.js (version 1.1)
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/app/**/*.{js,jsx}', './src/components/**/*.{js,jsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        /* ... (no changes here) ... */
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
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
        // START: ADDED NEW "COMET" ANIMATION
        'comet-in': {
          '0%': {
            opacity: '0',
            transform: 'translateX(50%) translateY(-50%) scale(0.5) rotate(-15deg)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(-50%) translateY(-50%) scale(1) rotate(0deg)',
          },
        },
        'comet-out': {
          '0%': {
            opacity: '1',
            transform: 'translateX(-50%) translateY(-50%) scale(1) rotate(0deg)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateX(-150%) translateY(50%) scale(0.5) rotate(15deg)',
          },
        },
        // END: ADDED NEW "COMET" ANIMATION
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        shake: 'shake 0.5s ease-in-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // START: ADDED NEW "COMET" ANIMATION
        'comet-in': 'comet-in 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
        'comet-out': 'comet-out 0.4s ease-in',
        // END: ADDED NEW "COMET" ANIMATION
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}
