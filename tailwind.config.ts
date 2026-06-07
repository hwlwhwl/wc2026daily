import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          dark: '#0a1628',
          mid: '#0d2137',
          light: '#112a45',
        },
        gold: {
          DEFAULT: '#f59e0b',
          light: '#fcd34d',
        },
      },
    },
  },
  plugins: [],
};

export default config;
