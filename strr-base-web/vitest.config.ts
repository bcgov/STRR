import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'bun:test': fileURLToPath(new URL('./vitest.config.ts', import.meta.url)),
      zod: fileURLToPath(new URL('./node_modules/zod/index.cjs', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url))
    }
  },
  test: {
    pool: 'threads',
    dir: 'tests/unit',
    globals: true,
    environment: 'happy-dom'
  }
})
