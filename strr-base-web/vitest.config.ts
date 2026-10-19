import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    dir: 'tests/unit',
    globals: true,
    environment: 'happy-dom'
  }
})
