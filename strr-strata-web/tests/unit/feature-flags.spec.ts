import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useStrataFeatureFlags } from '@/composables/useStrataFeatureFlags'

mockNuxtImport('useFeatureFlags', () => () => ({
  isFeatureEnabled: vi.fn().mockReturnValue(ref(true))
}))

describe('useStrataFeatureFlags', () => {
  it('returns isSaveDraftEnabled true when the flag is enabled', () => {
    const { isSaveDraftEnabled } = useStrataFeatureFlags()
    expect(isSaveDraftEnabled.value).toBe(true)
  })
})
