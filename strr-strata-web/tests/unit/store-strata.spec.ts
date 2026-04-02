import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { vi, describe, beforeEach, it, expect } from 'vitest'
import { mockPermitDetailsData, mockApiAddress, mockStoredDocument, mockPrimaryRep } from '../mocks/mockedData'

const mockApplication = ref<any>(undefined)
const mockRegistration = ref<any>(undefined)
const mockPermitDetails = ref<any>(undefined)
const mockShowPermitDetails = ref(false)
const mockLoadPermitData = vi.fn()
const mockLoadPermitRegistrationData = vi.fn()

mockNuxtImport('useStrrBasePermit', () => () => ({
  application: mockApplication,
  registration: mockRegistration,
  permitDetails: mockPermitDetails,
  showPermitDetails: mockShowPermitDetails,
  isPaidApplication: ref(false),
  loadPermitData: mockLoadPermitData,
  loadPermitRegistrationData: mockLoadPermitRegistrationData
}))

const mockGetAccountRegistrations = vi.fn()

mockNuxtImport('useStrrApi', () => () => ({
  getAccountRegistrations: mockGetAccountRegistrations
}))

const makeApplication = (headerOverrides: Record<string, unknown> = {}) => ({
  header: {
    applicationNumber: '1234567890',
    status: 'DRAFT',
    registrationId: undefined,
    ...headerOverrides
  },
  registration: mockPermitDetailsData
})

describe('Strata Store functions', () => {
  beforeEach(() => {
    mockApplication.value = undefined
    mockPermitDetails.value = undefined
    mockShowPermitDetails.value = false
    mockLoadPermitData.mockReset()
    mockLoadPermitRegistrationData.mockReset()
    mockGetAccountRegistrations.mockReset()
  })

  it('reset sub-stores to initial state', () => {
    const store = useStrrStrataStore()
    const contactStore = useStrrContactStore()
    const detailsStore = useStrrStrataDetailsStore()
    const documentStore = useDocumentStore()

    contactStore.primaryRep = mockPrimaryRep
    detailsStore.strataDetails.numberOfUnits = 99
    documentStore.storedDocuments.push(mockStoredDocument)

    store.$reset()

    expect(contactStore.primaryRep).toBeUndefined()
    expect(detailsStore.strataDetails.numberOfUnits).toBeUndefined()
    expect(documentStore.storedDocuments).toHaveLength(0)
  })

  it('reset application, registration and isRegistrationRenewal', () => {
    const store = useStrrStrataStore()
    mockApplication.value = makeApplication()
    mockRegistration.value = { id: 'reg-1' }
    store.isRegistrationRenewal = true

    store.$reset()

    expect(store.application).toBeUndefined()
    expect(store.registration).toBeUndefined()
    expect(store.isRegistrationRenewal).toBe(false)
  })

  it('load permit data and populate completingParty when showPermitDetails is false', async () => {
    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = makeApplication()
    })

    const store = useStrrStrataStore()
    await store.loadStrata('1234567890')

    expect(mockLoadPermitData).toHaveBeenCalledOnce()
    expect(mockLoadPermitData).toHaveBeenCalledWith('1234567890')
    const { completingParty } = useStrrContactStore()
    expect(completingParty.firstName).toBe('Jane')
    expect(completingParty.lastName).toBe('Doe')
    expect(completingParty.emailAddress).toBe('jane@example.com')
  })

  it('fully populate stores and set isCompletingPartyRep when showPermitDetails is true', async () => {
    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = makeApplication()
      mockPermitDetails.value = mockPermitDetailsData
    })
    mockShowPermitDetails.value = true

    await useStrrStrataStore().loadStrata('1234567890')

    const contactStore = useStrrContactStore()
    expect(contactStore.primaryRep).toBeDefined()
    expect(contactStore.primaryRep!.firstName).toBe('Jane')
    expect(contactStore.secondaryRep).toBeUndefined()
    expect(contactStore.isCompletingPartyRep).toBe(true)
    expect(useStrrStrataBusinessStore().strataBusiness.legalName).toBe('Test Corp')
    expect(useStrrStrataDetailsStore().strataDetails.numberOfUnits).toBe(10)
    expect(useStrrStrataDetailsStore().strataDetails.brand.name).toBe('Test Brand')

    const docs = useDocumentStore().storedDocuments
    expect(docs).toHaveLength(1)
    expect(docs[0].name).toBe('permit.pdf')
    expect(docs[0].uploadStep).toBe('UPLOAD')
    expect(docs[0].id).toBeTruthy()
  })

  it('calls getAccountRegistrations and sets originalBuildingCount for a renewal draft', async () => {
    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = makeApplication({ applicationType: 'renewal', registrationId: 99 })
      mockPermitDetails.value = mockPermitDetailsData
    })
    mockShowPermitDetails.value = true
    mockGetAccountRegistrations.mockResolvedValue({
      strataHotelDetails: { buildings: [mockApiAddress] } // 1 building in original
    })

    await useStrrStrataStore().loadStrata('1234567890', true)

    expect(mockGetAccountRegistrations).toHaveBeenCalledOnce()
    expect(mockGetAccountRegistrations).toHaveBeenCalledWith(99)
    expect(useStrrStrataDetailsStore().originalBuildingCount).toBe(1)
  })

  it('skip getAccountRegistrations and fall back to org building count for new application', async () => {
    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = makeApplication()
      mockPermitDetails.value = mockPermitDetailsData
    })
    mockShowPermitDetails.value = true

    await useStrrStrataStore().loadStrata('1234567890')

    expect(mockGetAccountRegistrations).not.toHaveBeenCalled()
    expect(useStrrStrataDetailsStore().originalBuildingCount).toBe(2)
  })

  it('skip getAccountRegistrations when registrationId is undefined', async () => {
    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = makeApplication({ applicationType: 'renewal', registrationId: undefined })
      mockPermitDetails.value = mockPermitDetailsData
    })

    await useStrrStrataStore().loadStrata('1234567890', true)

    expect(mockGetAccountRegistrations).not.toHaveBeenCalled()
  })

  it('skip getAccountRegistrations when loadDraft is false', async () => {
    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = makeApplication({ applicationType: 'renewal', registrationId: 42 })
    })

    await useStrrStrataStore().loadStrata('1234567890') // loadDraft defaults to false

    expect(mockGetAccountRegistrations).not.toHaveBeenCalled()
  })

  it('reset sub-stores, load registration data to populate from the loaded data', async () => {
    mockLoadPermitRegistrationData.mockImplementation(() => {
      mockPermitDetails.value = mockPermitDetailsData
      mockShowPermitDetails.value = true
    })

    const store = useStrrStrataStore()
    const businessStore = useStrrStrataBusinessStore()
    businessStore.strataBusiness.legalName = 'My business inc'

    await store.loadStrataRegistrationData('H123456789')

    expect(mockLoadPermitRegistrationData).toHaveBeenCalledOnce()
    expect(mockLoadPermitRegistrationData).toHaveBeenCalledWith('H123456789')
    expect(businessStore.strataBusiness.legalName).toBe('Test Corp')
    expect(useStrrStrataDetailsStore().strataDetails.numberOfUnits).toBe(10)
  })
})
