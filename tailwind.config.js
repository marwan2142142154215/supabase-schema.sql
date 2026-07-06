/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0a0a0f',
        secondary: '#12121a',
        cardbg: 'rgba(255, 255, 255, 0.05)',
        accent: {
          indigo: '#6366f1',
          gold: '#f59e0b',
          green: '#22c55e',
          red: '#ef4444',
          orange: '#f97316',
        },
        border: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
