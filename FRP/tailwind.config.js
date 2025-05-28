/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0eefe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#36a9f8',
          500: '#0c8ee7',
          600: '#006fc5',
          700: '#0059a0',
          800: '#064a83',
          900: '#0a3f6d',
        },
        secondary: {
          50: '#f3f1ff',
          100: '#ebe5ff',
          200: '#d9d0ff',
          300: '#bfacff',
          400: '#9f7eff',
          500: '#8450ff',
          600: '#7331f0',
          700: '#6222d0',
          800: '#541daa',
          900: '#421c87',
        },
        accent: {
          50: '#fcf3f3',
          100: '#f8e6e6',
          200: '#f4d0d0',
          300: '#eaaeae',
          400: '#da7d7d',
          500: '#c95252',
          600: '#b93939',
          700: '#9c2727',
          800: '#842323',
          900: '#6f2222',
        },
        dark: {
          800: '#1a1a2e',
          900: '#0f0f1a',
        },
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}