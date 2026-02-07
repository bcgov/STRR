import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, reactive } from 'vue'
import { loadSavedTab, useExaminerDashboardPersistence } from '~/composables/useExaminerDashboardPersistence'

describe('loadSavedTab', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn()
    })
  })

  it('returns true when stored tab is applications', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue('applications')
    expect(loadSavedTab()).toBe(true)
  })

  it('returns false when stored tab is registrations', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue('registrations')
    expect(loadSavedTab()).toBe(false)
  })

  it('returns null when key is missing or invalid', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(null)
    expect(loadSavedTab()).toBe(null)

    vi.mocked(sessionStorage.getItem).mockReturnValue('other')
    expect(loadSavedTab()).toBe(null)
  })

  it('returns null when sessionStorage throws', () => {
    vi.mocked(sessionStorage.getItem).mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    expect(loadSavedTab()).toBe(null)
  })
})

describe('useExaminerDashboardPersistence', () => {
  it('runs without throwing when given mock store and refs', () => {
    const mockStore = {
      tableFilters: reactive({
        searchText: '',
        registrationNumber: '',
        registrationType: [],
        requirements: [],
        applicantName: '',
        propertyAddress: '',
        status: [],
        submissionDate: { start: null, end: null },
        lastModified: { start: null, end: null },
        localGov: '',
        adjudicator: ''
      }),
      tablePage: ref(1),
      tableLimit: ref(50)
    }

    expect(() => {
      useExaminerDashboardPersistence(
        mockStore as any,
        ref(true),
        ref(true)
      )
    }).not.toThrow()
  })

  it('does not overwrite store when split disabled', async () => {
    const { nextTick } = await import('vue')
    const mockStore = {
      tableFilters: reactive({
        searchText: 'keep',
        registrationNumber: '',
        registrationType: [] as string[],
        requirements: [] as string[],
        applicantName: '',
        propertyAddress: '',
        status: [] as string[],
        submissionDate: { start: null, end: null },
        lastModified: { start: null, end: null },
        localGov: '',
        adjudicator: ''
      }),
      tablePage: ref(1),
      tableLimit: ref(50)
    }

    useExaminerDashboardPersistence(mockStore as any, ref(true), ref(false))
    await nextTick()

    expect(mockStore.tableFilters.searchText).toBe('keep')
  })
})
