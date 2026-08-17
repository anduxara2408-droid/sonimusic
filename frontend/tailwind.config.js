/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'soni-black': '#0a0a0a',
        'soni-dark': '#121212',
        'soni-gold': '#d4af37',
        'soni-white': '#ffffff',
        'soni-gray': '#b3b3b3',
        'soni-gray-dark': '#282828',
      }
    },
  },
  plugins: [],
}
