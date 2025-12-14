/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        brand: {
          midnight: '#0D1B2A',
          abyss: '#132141',
          dusk: '#1B263B',
          coral: '#E76F51',
          teal: '#2EC4B6',
          ivory: '#F4F1DE',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Soehne"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', '"Canela"', 'serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'cora-breathe': 'cora-breathe 3.4s ease-in-out infinite',
        'cora-think': 'cora-think 6s ease-in-out infinite',
      },
      keyframes: {
        'cora-breathe': {
          '0%': { transform: 'scale(1)', opacity: '0.85' },
          '55%': { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0.85' },
        },
        'cora-think': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}


