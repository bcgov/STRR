/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['**.{html,ts,js,vue}'],
  presets: [require('@daxiom/nuxt-core-layer-test/tailwind.config')],
  theme: {
    extend: {
      maxWidth: {
        bcGovInput: '600px'
      },
      colors: {
        midnightBlue: {
          50: '#eef7ff',
          100: '#dceeff',
          200: '#b2dfff',
          300: '#6dc6ff',
          400: '#20a8ff',
          500: '#008dff',
          600: '#006edf',
          700: '#0057b4',
          800: '#004a94',
          900: '#003366',
          950: '#002651'
        }
      }
    }
  }
}
