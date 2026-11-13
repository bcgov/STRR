import coreLayerConfig from '@daxiom/nuxt-core-layer-test/tailwind.config'

/** @type {import('tailwindcss').Config} */
export default {
  // '**' globs crawl node_modules; @nuxtjs/tailwindcss already adds each layer's app/ dirs
  content: ['./app/**/*.{html,ts,js,vue}'],
  presets: [coreLayerConfig],
  theme: {
    extend: {
      colors: {
        str: {
          green: '#18691C',
          bgGreen: '#E8F5E9',
          blue: '#38598A',
          bgBlue: '#E4EDF7',
          red: '#D3272C',
          bgRed: '#FAE9E9',
          textGray: '#212529',
          bodyGray: '#495057',
          mutedGray: '#757575',
          bgGray: '#F1F3F5'
        }
      }
    }
  }
}
