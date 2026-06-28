/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      backdropBlur: {
        xs: '4px',
        '3xl': '40px',
      },
      borderRadius: {
        '4xl': '32px',
        '5xl': '40px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(31, 38, 135, 0.15)',
        'glass-lg': '0 16px 48px rgba(31, 38, 135, 0.20)',
        'ios-blue': '0 8px 20px rgba(0, 122, 255, 0.28)',
        'ios-blue-lg': '0 12px 32px rgba(0, 122, 255, 0.35)',
      },
      keyframes: {
        'fade-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'spring-up': {
          '0%':   { opacity: '0', transform: 'translateY(100%)' },
          '55%':  { opacity: '1', transform: 'translateY(-12px)' },
          '75%':  { transform: 'translateY(5px)' },
          '90%':  { transform: 'translateY(-2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'blob-pulse': {
          '0%, 100%': { transform: 'scale(1)',    opacity: '0.55' },
          '50%':      { transform: 'scale(1.18)', opacity: '0.85' },
        },
        'icon-pop': {
          '0%':   { opacity: '0', transform: 'scale(0.4) translateY(10px)' },
          '65%':  { transform: 'scale(1.15) translateY(-3px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'count-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px) scale(0.8)' },
          '60%':  { opacity: '1', transform: 'translateY(-4px) scale(1.06)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-slide-up': 'fade-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'spring-up': 'spring-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'blob-pulse': 'blob-pulse 2.4s ease-in-out infinite',
        'icon-pop': 'icon-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'count-up': 'count-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
};
