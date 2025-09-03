/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          grass: '#1B5E20',
          stripes: '#1A4D1A',
          lines: '#FFFFFF'
        },
        team: {
          red: '#EF4444',
          blue: '#3B82F6',
          green: '#22C55E',
          yellow: '#EAB308'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}