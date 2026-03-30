import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import {
  mockHostApplication,
  mockHostApplicationWithReviewer,
  mockHostApplicationWithoutReviewer,
  mockHostRegistration,
  MOCK_UNIT_ADDRESS,
  mockSnapshots
} from '../mocks/mockedData'
import { ApplicationStatus, RegistrationStatus } from '#imports'

const { getSplitDashboardEnabled, setSplitDashboardEnabled } = vi.hoisted(() => {
  let splitDashboardEnabled = false
  return {
    getSplitDashboardEnabled: () => splitDashboardEnabled,
    setSplitDashboardEnabled: (value: boolean) => {
      splitDashboardEnabled = value
    }
  }
})

// mock $strrApi accessed through useNuxtApp()
const mockStrrApi = vi.fn().mockResolvedValue({})

mockNuxtImport('useNuxtApp', () => () => ({
  $i18n: { t: (key: string) => key },
  $strrApi: mockStrrApi
}))

mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplications: vi.fn()
}))

mockNuxtImport('useKeycloak', () => () => ({
  kcUser: ref({ userName: 'examiner1' })
}))

mockNuxtImport('useStrrModals', () => () => ({
  openErrorModal: vi.fn()
}))

vi.mock('@/composables/useExaminerFeatureFlags', () => ({
  useExaminerFeatureFlags: () => ({ isSplitDashboardTableEnabled: ref(getSplitDashboardEnabled()) })
}))

describe('Store - Examiner', () => {
  beforeEach(() => {
    setSplitDashboardEnabled(false)
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStrrApi.mockResolvedValue({})
  })

  it('should have correct application and registration records', () => {
    const store = useExaminerStore()

    // no activeRecord
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
          applicationNumber: '0987654321',
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

  it('should return correct hasRegistrationNumber computed base on the header info', () => {
    const store = useExaminerStore()

    // no activeRecord
    expect(store.hasRegistrationNumber).toBe(false)

    // application header without registrationNumber
    store.activeRecord = mockHostApplication
    expect(store.hasRegistrationNumber).toBe(false)

    // application header with registrationNumber
    store.activeRecord = {
      ...mockHostApplication,
      header: { ...mockHostApplication.header, registrationNumber: 'REG12345678' }
    }
    expect(store.hasRegistrationNumber).toBe(true)
  })

  it('should have correct status filter for application and registration in the query', async () => {
    const store = useExaminerStore()

    store.tableFilters.status = [RegistrationStatus.ACTIVE] as any
    await store.fetchApplications()

    expect(mockStrrApi).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      query: expect.objectContaining({
        status: [],
        registrationStatus: [RegistrationStatus.ACTIVE]
      })
    }))

    mockStrrApi.mockClear()

    store.tableFilters.status = [ApplicationStatus.FULL_REVIEW] as any
    await store.fetchApplications()

    expect(mockStrrApi).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      query: expect.objectContaining({
        status: [ApplicationStatus.FULL_REVIEW],
        registrationStatus: []
      })
    }))
  })

  it('should include approval and NOC statuses in application status query for old dashboard', async () => {
    const store = useExaminerStore()

    store.tableFilters.status = [
      ApplicationStatus.PROVISIONALLY_APPROVED,
      ApplicationStatus.AUTO_APPROVED,
      ApplicationStatus.FULL_REVIEW_APPROVED,
      ApplicationStatus.NOC_PENDING,
      ApplicationStatus.NOC_EXPIRED
    ] as any
    await store.fetchApplications()

    expect(mockStrrApi).toHaveBeenCalledWith('/applications', expect.objectContaining({
      query: expect.objectContaining({
        status: [
          ApplicationStatus.PROVISIONALLY_APPROVED,
          ApplicationStatus.AUTO_APPROVED,
          ApplicationStatus.FULL_REVIEW_APPROVED,
          ApplicationStatus.NOC_PENDING,
          ApplicationStatus.NOC_EXPIRED
        ],
        registrationStatus: []
      })
    }))
  })

  it('should include NOC statuses in application status query for split dashboard', async () => {
    setSplitDashboardEnabled(true)
    const store = useExaminerStore()

    store.tableFilters.status = [
      ApplicationStatus.FULL_REVIEW,
      ApplicationStatus.NOC_PENDING,
      ApplicationStatus.NOC_EXPIRED,
      ApplicationStatus.DECLINED,
      ApplicationStatus.PAYMENT_DUE,
      ApplicationStatus.DRAFT
    ] as any
    await store.fetchApplications()

    expect(mockStrrApi).toHaveBeenCalledWith('/applications', expect.objectContaining({
      query: expect.objectContaining({
        status: [
          ApplicationStatus.FULL_REVIEW,
          ApplicationStatus.NOC_PENDING,
          ApplicationStatus.NOC_EXPIRED,
          ApplicationStatus.DECLINED,
          ApplicationStatus.PAYMENT_DUE,
          ApplicationStatus.DRAFT
        ],
        registrationStatus: [],
        applicationsOnly: true
      })
    }))
  })

  it('should correctly show assigned and unassigned examiner for active record', async () => {
    const store = useExaminerStore()

    store.activeRecord = mockHostApplicationWithReviewer
    await nextTick()
    expect(store.isAssignedToUser).toBe(true)

    store.activeRecord = mockHostApplicationWithoutReviewer
    await nextTick()
    expect(store.isAssignedToUser).toBe(false)
  })

  it('should clear all table filters and reset to defaults', () => {
    const store = useExaminerStore()

    store.tableFilters.searchText = 'Victoria'
    store.tableFilters.propertyAddress = '123 Main St'
    store.tableFilters.registrationNumber = 'H1234567890'
    store.tableFilters.adjudicator = 'examiner1'
    store.tableFilters.registrationType = [ApplicationType.HOST] as any
    store.tableFilters.status = [ApplicationStatus.FULL_REVIEW] as any
    store.tableFilters.localGov = 'Victoria'

    store.resetFilters()

    expect(store.tableFilters).toEqual({
      searchText: '',
      registrationNumber: '',
      registrationType: [],
      requirements: [],
      applicantName: '',
      propertyAddress: '',
      status: [],
      subStatus: [],
      submissionDate: { start: null, end: null },
      lastModified: { start: null, end: null },
      localGov: '',
      adjudicator: ''
    })
  })

  it('should show compose noc email for FULL_REVIEW and PROVISIONAL_REVIEW statuses', () => {
    const store = useExaminerStore()

    store.activeRecord = mockHostApplication // status: FULL_REVIEW
    expect(store.showComposeNocEmail).toBe(true)

    store.activeRecord = {
      ...mockHostApplication,
      header: { ...mockHostApplication.header, status: ApplicationStatus.PROVISIONAL_REVIEW }
    }
    expect(store.showComposeNocEmail).toBe(true)

    store.activeRecord = {
      ...mockHostApplication,
      header: { ...mockHostApplication.header, status: ApplicationStatus.NOC_PENDING }
    }
    expect(store.showComposeNocEmail).toBe(false)
  })

  it('should show compose email for NOC_PENDING application and ACTIVE registration', () => {
    const store = useExaminerStore()

    store.activeRecord = {
      ...mockHostApplication,
      header: { ...mockHostApplication.header, status: ApplicationStatus.NOC_PENDING }
    }
    expect(store.showComposeEmail).toBe(true)

    store.activeRecord = mockHostRegistration // status: ACTIVE, examinerActions: ['APPROVE', 'CANCEL', 'SUSPEND']
    expect(store.showComposeEmail).toBe(true)

    store.activeRecord = mockHostApplication // FULL_REVIEW application
    expect(store.showComposeEmail).toBe(false)
  })

  it('should clear all filters, reset statuses and page', async () => {
    const store = useExaminerStore()

    store.tableFilters.searchText = 'test'
    store.tablePage = 5

    store.resetFilters()
    await nextTick()

    expect(store.tableFilters.searchText).toBe('')
    expect(store.tableFilters.status).toEqual([])
    expect(store.tableFilters.subStatus).toEqual([])
    expect(store.tablePage).toBe(1)
  })

  it('should call correct endpoint and have correct query when searching by text', async () => {
    const store = useExaminerStore()

    await store.fetchRegistrations()

    expect(mockStrrApi).toHaveBeenCalledWith('/registrations/search', expect.objectContaining({
      query: expect.objectContaining({ text: undefined })
    }))

    mockStrrApi.mockClear()

    store.tableFilters.searchText = 'Vancouver'
    await store.fetchRegistrations()

    expect(mockStrrApi).toHaveBeenCalledWith('/registrations/search', expect.objectContaining({
      query: expect.objectContaining({ text: 'Vancouver' })
    }))
  })

  it('should include all active table filters in the search query', async () => {
    const store = useExaminerStore()

    store.tableFilters.searchText = 'Victoria'
    store.tableFilters.propertyAddress = '123 Main St'
    store.tableFilters.registrationNumber = 'H1234567890'
    store.tableFilters.adjudicator = 'examiner1'
    store.tableFilters.registrationType = [ApplicationType.HOST] as any
    store.tableFilters.status = [ApplicationStatus.FULL_REVIEW] as any
    await store.fetchApplications()

    expect(mockStrrApi).toHaveBeenCalledWith('/applications/search', expect.objectContaining({
      query: {
        limit: 50,
        page: 1,
        registrationType: [ApplicationType.HOST],
        status: [ApplicationStatus.FULL_REVIEW],
        registrationStatus: [],
        text: 'Victoria',
        sortOrder: 'asc',
        sortBy: 'application_date',
        address: '123 Main St',
        recordNumber: 'H1234567890',
        assignee: 'examiner1',
        requirement: []
      }
    }))
  })

  it('should call correct endpoint, set activeRecord, and return response on getApplicationById', async () => {
    const store = useExaminerStore()
    mockStrrApi.mockResolvedValueOnce(mockHostApplication)

    const response = await store.getApplicationById('1234567890')

    expect(mockStrrApi).toHaveBeenCalledWith('/applications/1234567890', expect.objectContaining({
      method: 'GET'
    }))
    expect(store.activeRecord).toEqual(mockHostApplication)
    expect(response).toEqual(mockHostApplication)
  })

  it('should call correct endpoint, update activeRecord, and clear edit state on saveRentalUnitAddress', async () => {
    const store = useExaminerStore()
    const updatedAddress = { ...MOCK_UNIT_ADDRESS, city: 'Kelowna' }
    const updatedRegistration = { ...mockHostRegistration, unitAddress: updatedAddress }
    mockStrrApi.mockResolvedValueOnce(updatedRegistration)

    store.activeRecord = mockHostRegistration
    store.startEditRentalUnitAddress()
    store.hasUnsavedRentalUnitChanges = true

    await store.saveRentalUnitAddress(updatedAddress, 99, false)

    expect(mockStrrApi).toHaveBeenCalledWith('/registrations/99/str-address',
      expect.objectContaining({
        method: 'PATCH',
        body: { unitAddress: updatedAddress }
      }))
    expect(store.activeRecord).toEqual(updatedRegistration)
    expect(store.isEditingRentalUnit).toBe(false)
    expect(store.rentalUnitAddressToEdit).toEqual({})
    expect(store.hasUnsavedRentalUnitChanges).toBe(false)

    // application path uses applications endpoint
    mockStrrApi.mockClear()
    mockStrrApi.mockResolvedValueOnce({})
    await store.saveRentalUnitAddress(updatedAddress, '1234567890', true)
    expect(mockStrrApi).toHaveBeenCalledWith('/applications/1234567890/str-address', expect.anything())
  })

  it('should call correct endpoint on updateRegistrationStatus', async () => {
    const store = useExaminerStore()

    await store.updateRegistrationStatus(42, RegistrationStatus.SUSPENDED)

    expect(mockStrrApi).toHaveBeenCalledWith('/registrations/42/status',
      expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({ status: RegistrationStatus.SUSPENDED })
      }))

    expect(mockStrrApi).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.objectContaining({ emailContent: expect.anything() }) })
    )

    mockStrrApi.mockClear()

    await store.updateRegistrationStatus(42, RegistrationStatus.CANCELLED, 'cancel notice email')

    expect(mockStrrApi).toHaveBeenCalledWith('/registrations/42/status',
      expect.objectContaining({
        body: expect.objectContaining({
          status: RegistrationStatus.CANCELLED,
          emailContent: 'cancel notice email'
        })
      }))
  })

  it('should return correct events on success and error for application filing history', async () => {
    const store = useExaminerStore()
    const mockEvents = [{ id: 1, type: 'SUBMITTED' }, { id: 2, type: 'APPROVED' }]
    mockStrrApi.mockResolvedValueOnce(mockEvents)

    const result = await store.getApplicationFilingHistory('1234567890')
    expect(mockStrrApi).toHaveBeenCalledWith('/applications/1234567890/events',
      expect.objectContaining({ method: 'GET' }))
    expect(result).toEqual(mockEvents)

    mockStrrApi.mockClear()
    mockStrrApi.mockRejectedValueOnce(new Error('network error'))
    expect(await store.getApplicationFilingHistory('1234567890')).toEqual([])
  })

  it('should return events on success and error for registration filing history', async () => {
    const store = useExaminerStore()
    const mockEvents = [{ id: 1, type: 'STATUS_CHANGED' }, { id: 2, type: 'SUSPENDED' }]
    mockStrrApi.mockResolvedValueOnce(mockEvents)

    const result = await store.getRegistrationFilingHistory(99)
    expect(mockStrrApi).toHaveBeenCalledWith('/registrations/99/events',
      expect.objectContaining({ method: 'GET' }))
    expect(result).toEqual(mockEvents)

    mockStrrApi.mockClear()
    mockStrrApi.mockRejectedValueOnce(new Error('network error'))
    expect(await store.getRegistrationFilingHistory(99)).toEqual([])
  })

  it('should call correct endpoint on getRegistrationById', async () => {
    const store = useExaminerStore()
    mockStrrApi.mockResolvedValueOnce(mockHostRegistration)

    const result = await store.getRegistrationById('99')

    expect(mockStrrApi).toHaveBeenCalledWith('/registrations/99',
      expect.objectContaining({ method: 'GET' }))
    expect(store.activeRecord).toEqual(mockHostRegistration)
    expect(result).toEqual(mockHostRegistration)
  })

  it('should update application actions with correct status', async () => {
    const store = useExaminerStore()

    await store.approveApplication('1234567890')
    expect(mockStrrApi).toHaveBeenCalledWith('/applications/1234567890/status', expect.objectContaining({
      method: 'PUT',
      body: expect.objectContaining({ status: ApplicationStatus.FULL_REVIEW_APPROVED })
    }))

    mockStrrApi.mockClear()

    await store.provisionallyApproveApplication('55544433322')
    expect(mockStrrApi).toHaveBeenCalledWith('/applications/55544433322/status', expect.objectContaining({
      method: 'PUT',
      body: expect.objectContaining({ status: ApplicationStatus.PROVISIONALLY_APPROVED })
    }))

    mockStrrApi.mockClear()

    await store.rejectApplication('9992223342', false)
    expect(mockStrrApi).toHaveBeenCalledWith('/applications/9992223342/status', expect.objectContaining({
      method: 'PUT',
      body: expect.objectContaining({ status: ApplicationStatus.DECLINED })
    }))
    expect(mockStrrApi).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.objectContaining({ emailContent: expect.anything() }) })
    )

    mockStrrApi.mockClear()

    await store.rejectApplication('APP-004', true, 'email body')
    expect(mockStrrApi).toHaveBeenCalledWith('/applications/APP-004/status', expect.objectContaining({
      body: expect.objectContaining({
        status: ApplicationStatus.PROVISIONALLY_DECLINED,
        emailContent: 'email body'
      })
    }))
  })

  it('should have correct response for getSnapshotById', async () => {
    const store = useExaminerStore()
    mockStrrApi.mockResolvedValueOnce(mockSnapshots[0])

    const result = await store.getSnapshotById('99', 'snapshot-1')

    expect(mockStrrApi).toHaveBeenCalledWith('/registrations/99/snapshots/snapshot-1',
      expect.objectContaining({ method: 'GET' }))
    expect(result).toEqual(mockSnapshots[0])
  })

  it('should correctly edit and reset rental unit address', () => {
    const store = useExaminerStore()
    store.activeRecord = mockHostRegistration

    store.startEditRentalUnitAddress()

    expect(store.isEditingRentalUnit).toBe(true)
    expect(store.rentalUnitAddressToEdit).toEqual(MOCK_UNIT_ADDRESS)
    expect(store.hasUnsavedRentalUnitChanges).toBe(false)

    store.hasUnsavedRentalUnitChanges = true
    store.resetEditRentalUnitAddress()

    expect(store.isEditingRentalUnit).toBe(false)
    expect(store.rentalUnitAddressToEdit).toEqual({})
    expect(store.hasUnsavedRentalUnitChanges).toBe(false)
  })
})
