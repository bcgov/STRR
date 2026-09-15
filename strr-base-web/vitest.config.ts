import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig(async () => ({
  test: {
    dir: 'tests/unit',
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          include: ['tests/unit/**/*.spec.ts'],
          exclude: ['tests/unit/**/*.nuxt.spec.ts']
        }
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          globals: true,
          include: ['tests/unit/**/*.nuxt.spec.ts']
        }
      })
    ]
  }
}))
