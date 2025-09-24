// tailwind.config.ts (Tailwind v4 configuration)
import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#007bff', // Your brand blue
          600: '#0056b3',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        gray: {
          25: '#fcfcfd',
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e0e0e0',
          300: '#d0d0d0',
          400: '#9ca3af',
          500: '#666666',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      spacing: {
        '15': '3.75rem',  // For right menu toggle button
        '70': '17.5rem',  // For right menu width
        '80': '20rem',    // For sidebar width
      },
      borderWidth: {
        '3': '3px',
      },
      ringWidth: {
        '3': '3px',
      },
      zIndex: {
        '60': '60',
      },
    },
  },
  plugins: [],
} satisfies Config