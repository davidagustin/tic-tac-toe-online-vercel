/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'purple-500': '#a855f7',
        'purple-600': '#9333ea',
        'pink-500': '#ec4899',
        'pink-600': '#db2777',
        'red-500': '#ef4444',
        'red-600': '#dc2626',
        'gray-500': '#6b7280',
        'slate-500': '#64748b',
        'green-500': '#22c55e',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
} 