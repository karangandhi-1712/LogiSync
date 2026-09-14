/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        // Brand accent — Light: sky-600, Dark: electric cyan
        accent: {
          DEFAULT: '#0284c7',
          dark: '#06b6d4',
          hover: '#0369a1',
          glow: 'rgba(6, 182, 212, 0.25)',
        },
        // Semantic status colors (light/dark defined via CSS vars in index.css)
        success: {
          light: '#059669',
          dark: '#10b981',
        },
        warning: {
          light: '#d97706',
          dark: '#f59e0b',
        },
        danger: {
          light: '#dc2626',
          dark: '#ef4444',
        },
        // Dark theme surface colors
        navy: {
          950: '#0a0f1e',
          900: '#051424',
          800: '#0d1c2d',
          700: 'rgba(30, 41, 59, 0.7)',
          600: 'rgba(15, 23, 42, 0.85)',
        },
      },
      boxShadow: {
        'card-light': '0 4px 20px -2px rgba(0,0,0,0.05)',
        'card-dark': '0 8px 32px rgba(6, 182, 212, 0.08)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-sky': '0 0 20px rgba(2, 132, 199, 0.3)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'radar-sweep': 'radar-sweep 3.2s linear infinite',
      },
      keyframes: {
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      backgroundImage: {
        'grid-light': "linear-gradient(to right, #e2e8f015 1px, transparent 1px), linear-gradient(to bottom, #e2e8f015 1px, transparent 1px)",
        'grid-dark': "linear-gradient(to right, #1e293b20 1px, transparent 1px), linear-gradient(to bottom, #1e293b20 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '4rem 4rem',
      },
    },
  },
  plugins: [],
};
