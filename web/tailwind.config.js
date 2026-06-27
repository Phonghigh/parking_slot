/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Grab Green (theo docs/knowledgebase/ui-ux/01-design-system.md)
        brand: {
          50: '#E6F9EE',
          100: '#C2F0D4',
          200: '#92E3B3',
          500: '#00B14F',
          600: '#009A45',
          700: '#007A35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Be Vietnam Pro', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
