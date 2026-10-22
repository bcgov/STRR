import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi } from 'vitest'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))
mockNuxtImport('useStrrExpansion', () => () => ({ open: mockOpen, close: vi.fn() }))

describe('useStrataExpansion', () => {
  it.each(['openBusiness', 'openIndividuals', 'openAllBuildings', 'openRentalUnits'] as const)(
    '%s replaces Filing History, so the header toggle is reset',
    (opener) => {
      const store = useExaminerStore()
      store.isFilingHistoryOpen = true
      mockOpen.mockClear()

      useStrataExpansion()[opener]()

      expect(mockOpen).toHaveBeenCalledOnce()
      expect(store.isFilingHistoryOpen).toBe(false)
    }
  )
})
