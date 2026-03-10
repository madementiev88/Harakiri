/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        harakiri: {
          red: '#C0392B',
          'red-dark': '#8B0000',
          bg: '#1A1A1A',
          card: '#2C2C2C',
          gray: '#AAAAAA',
          success: '#27AE60',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Text', 'system-ui', 'sans-serif'],
        display: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
