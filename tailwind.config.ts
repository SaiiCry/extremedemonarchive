import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#06070a',
        card: '#0e1117',
        'card-hover': '#161b24',
        border: '#1f2633',
        primary: {
          DEFAULT: '#ff1e27', // Extreme Demon Red
          hover: '#e01620',
          dark: '#a60f15',
        },
        secondary: {
          DEFAULT: '#8b5cf6', // Platformer Purple
          hover: '#7c3aed',
          dark: '#5b21b6',
        },
        muted: '#94a3b8',
        accent: '#f5f6f9',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 15px rgba(255, 30, 39, 0.15)',
        'glow-purple': '0 0 15px rgba(139, 92, 246, 0.15)',
        'glow-red-strong': '0 0 25px rgba(255, 30, 39, 0.3)',
        'glow-purple-strong': '0 0 25px rgba(139, 92, 246, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
