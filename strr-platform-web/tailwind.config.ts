import coreLayerConfig from '@daxiom/nuxt-core-layer-test/tailwind.config'

/** @type {import('tailwindcss').Config} */
export default {
  // '**' globs crawl node_modules; @nuxtjs/tailwindcss already adds each layer's app/ dirs
  content: ['./app/**/*.{html,ts,js,vue}'],
  presets: [coreLayerConfig]
}
