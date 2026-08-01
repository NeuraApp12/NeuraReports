import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        neura: {
          bg: '#07090F',
          surface: '#0E1320',
          elevated: '#161C2A',
          accent: '#6366F1',
          accent2: '#A855F7',
          focus: '#10B981',
          stress: '#EF4444',
          calm: '#3B82F6',
          cog: '#F59E0B',
          text: '#ECEEF3',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(99, 102, 241, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
