/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#0f4d3b',
          foreground: '#eafff6',
          border: 'rgba(255,255,255,0.10)',
          accent: 'rgba(255,255,255,0.08)',
          primary: '#34d399',
          'primary-foreground': '#083344'
        }
      },
      boxShadow: {
        soft: '0 10px 28px rgba(15,23,42,.08)'
      }
    }
  },
  plugins: []
};
