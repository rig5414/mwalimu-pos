/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        head: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#1a3a5c',
          light: '#e8f0f8',
          dark: '#0f2540',
        },
        accent: {
          DEFAULT: '#e8a020',
          light: '#fff8e8',
        },
        surface: {
          DEFAULT: '#ffffff',
          2: '#f0f2f5',
          3: '#f4f6f9',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        lg: '0 8px 24px rgba(0,0,0,0.12)',
        modal: '0 20px 60px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}
