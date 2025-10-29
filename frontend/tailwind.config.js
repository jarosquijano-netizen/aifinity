/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Use 'class' strategy instead of 'media' (browser preference)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0ea5e9',
        success: '#22c55e',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


