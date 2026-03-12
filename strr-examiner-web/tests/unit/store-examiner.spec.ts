import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { mockHostApplication, mockHostRegistration } from '../mocks/mockedData'
import { ApplicationStatus, RegistrationStatus } from '#imports'

// mock $strrApi accessed through useNuxtApp()
const mockStrrApi = vi.fn().mockResolvedValue({})

mockNuxtImport('useNuxtApp', () => () => ({
  $i18n: { t: (key: string) => key },
  $strrApi: mockStrrApi
}))

mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplications: vi.fn()
}))

const mockKcUser = ref({ userName: 'examiner1' })

mockNuxtImport('useKeycloak', () => () => ({ kcUser: mockKcUser }))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal: vi.fn() }))

vi.mock('@/composables/useExaminerFeatureFlags', () => ({
  useExaminerFeatureFlags: () => ({ isSplitDashboardTableEnabled: ref(false) })
}))

describe('Store - Examiner', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStrrApi.mockResolvedValue({})
    mockKcUser.value = { userName: 'examiner1' }
  })

  it('should have correct application and registration records', () => {
    const store = useExaminerStore()

    // no activeRecord set → both should be falsy
    expect(store.isApplication).toBe(false)
    expect(store.activeReg).toBeUndefined()

    // set application
    store.activeRecord = mockHostApplication
    expect(store.isApplication).toBe(true)
    expect(store.activeReg).toEqual(mockHostApplication.registration)
    expect(store.activeReg).not.toHaveProperty('header')

    // set registration
    store.activeRecord = mockHostRegistration
    expect(store.isApplication).toBe(false)
    expect(store.activeReg).toEqual(mockHostRegistration)
  })

  it('should have correct active header for registration', () => {
    const store = useExaminerStore()

    store.activeRecord = {
      ...mockHostRegistration,
      header: {
        ...mockHostRegistration.header,
        applications: [{
          applicationNumber: 'APP-001',
          applicationStatus: ApplicationStatus.FULL_REVIEW,
          applicationDateTime: '2025-01-01T00:00:00Z'
        }]
      }
    }

    const header = store.activeHeader

    expect(header).not.toHaveProperty('applications')
    expect(header).toHaveProperty('applicationStatus', ApplicationStatus.FULL_REVIEW)
    expect(header).toHaveProperty('applicationNumber', '12345678901234')
    expect(header).toHaveProperty('examinerStatus', mockHostRegistration.header.examinerStatus)
  })

  it('processStatusFilters separates registration and application statuses for API calls', async () => {
    const store = useExaminerStore()

    store.tableFilters.status = [RegistrationStatus.ACTIVE] as any
    await store.fetchApplications()

    let query = mockStrrApi.mock.calls[0]![1].query
    expect(query.status).toEqual([])
    expect(query.registrationStatus).toEqual([RegistrationStatus.ACTIVE])

    mockStrrApi.mockClear()

    store.tableFilters.status = [ApplicationStatus.FULL_REVIEW] as any
    await store.fetchApplications()

    query = mockStrrApi.mock.calls[0]![1].query
    expect(query.status).toEqual([ApplicationStatus.FULL_REVIEW])
    expect(query.registrationStatus).toEqual([])
  })
})
