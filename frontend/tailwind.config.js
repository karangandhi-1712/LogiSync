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
          950: '#060a17',
          900: '#0a1024',
          800: '#0f172a',
          700: 'rgba(30, 41, 59, 0.7)',
          600: 'rgba(15, 23, 42, 0.85)',
        },
        // Shining chromatic neon & aurora accents
        neon: {
          cyan: '#00f5d4',
          blue: '#00bbf9',
          purple: '#9b5de5',
          pink: '#f15bb5',
          yellow: '#fee440',
          violet: '#7928ca',
          emerald: '#10b981',
        },
      },
      boxShadow: {
        'card-light': '0 4px 20px -2px rgba(0,0,0,0.05)',
        'card-dark': '0 8px 32px rgba(6, 182, 212, 0.08)',
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.45)',
        'glow-sky': '0 0 25px rgba(2, 132, 199, 0.4)',
        'glow-violet': '0 0 25px rgba(121, 40, 202, 0.45)',
        'glow-amber': '0 0 25px rgba(245, 158, 11, 0.4)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.45)',
        // Neumorphic & Liquid Glass shadows
        'neu-light': '8px 8px 20px rgba(166, 180, 200, 0.45), -8px -8px 20px rgba(255, 255, 255, 0.95)',
        'neu-pressed-light': 'inset 3px 3px 6px rgba(166, 180, 200, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
        'neu-dark': '8px 8px 24px rgba(0, 0, 0, 0.55), -6px -6px 20px rgba(255, 255, 255, 0.04)',
        'neu-pressed-dark': 'inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 6px rgba(255, 255, 255, 0.05)',
        'liquid-card-light': '0 12px 36px -4px rgba(100, 120, 160, 0.12), inset 0 1px 1px 0 rgba(255, 255, 255, 0.8)',
        'liquid-card-dark': '0 16px 40px -6px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'radar-sweep': 'radar-sweep 3.2s linear infinite',
        'aurora-flow': 'aurora-flow 12s ease infinite alternate',
        'float-slow': 'float-slow 6s ease-in-out infinite alternate',
        'sheen-sweep': 'sheen-sweep 3s ease-in-out infinite',
      },
      keyframes: {
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'aurora-flow': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(30px, -20px) scale(1.08)' },
          '100%': { transform: 'translate(-20px, 20px) scale(0.96)' },
        },
        'float-slow': {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-12px)' },
        },
        'sheen-sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
      backgroundImage: {
        'grid-light': "linear-gradient(to right, #94a3b818 1px, transparent 1px), linear-gradient(to bottom, #94a3b818 1px, transparent 1px)",
        'grid-dark': "linear-gradient(to right, #38bdf812 1px, transparent 1px), linear-gradient(to bottom, #38bdf812 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '4rem 4rem',
      },
    },
  },
  plugins: [],
};
