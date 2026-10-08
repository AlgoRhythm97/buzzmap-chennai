/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a', // matte black
        charcoal: '#1a1a1a', // deep charcoal
        accent: {
          primary: '#00e5ff', // cyan
          secondary: '#2979ff', // electric blue
        },
        violet: {
          DEFAULT: '#7c4dff', // restrained violet
        },
        warning: {
          amber: '#ffb300',
          red: '#ff1744',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
