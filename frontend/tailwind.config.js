/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#00b4d8', // Cyan
          600: '#0096c7',
          700: '#0077b6',
          900: '#03045e', // Deep Blue
        },
        darkBg: {
          900: '#0d1b2a', // Deep navy
          800: '#1b263b',
          700: '#415a77',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
