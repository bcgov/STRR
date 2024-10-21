import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    dir: 'tests',
    coverage: {
      enabled: true,
      reporter: ['text', 'lcov', 'cobertura'],
      exclude: [
        '*.config.ts',
        'enums/*',
        'interfaces/*',
        '*.d.ts',
        '.nuxt/*',
        'public/',
        '**/middleware/',
        '**/layouts/',
        '**/page-data'
      ],
      reportsDirectory: 'coverage'
    },
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('./', import.meta.url)),
        domEnvironment: (process.env.VITEST_DOM_ENV as 'happy-dom' | 'jsdom') ?? 'happy-dom'
      }
    },
    setupFiles: ['./tests/setupTests.ts'],
    globals: true
  }
})
