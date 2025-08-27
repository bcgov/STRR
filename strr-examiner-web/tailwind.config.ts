/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['**.{html,ts,js,vue}'],
  presets: [require('@daxiom/nuxt-core-layer-test/tailwind.config')],
  // TODO: figure out how to take below from platform-web
  theme: {
    extend: {
      maxWidth: {
        bcGovInput: '600px'
      },
      colors: {
        str: {
          green: '#18691C',
          bgGreen: '#E8F5E9',
          blue: '#38598A',
          bgBlue: '#E4EDF7',
          red: '#D3272C',
          bgRed: '#FAE9E9',
          textGray: '#212529'
        },
        green: {
          50: '#f2fbf4',
          100: '#e2f6e6',
          200: '#c6eccd',
          300: '#99dca6',
          400: '#65c378',
          500: '#40a755',
          600: '#2e8540',
          700: '#286d37',
          800: '#24572f',
          900: '#1f4828',
          950: '#0c2713'
        },
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
