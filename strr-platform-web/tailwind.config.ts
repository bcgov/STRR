/** @type {import('tailwindcss').Config} */
module.exports = {
  // '**' globs crawl node_modules; @nuxtjs/tailwindcss already adds each layer's app/ dirs
  content: ['./app/**/*.{html,ts,js,vue}'],
  presets: [require('@daxiom/nuxt-core-layer-test/tailwind.config').default]
}
