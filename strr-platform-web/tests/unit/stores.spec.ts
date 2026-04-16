import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { vi, describe, beforeEach, it, expect } from 'vitest'
import { mockApiParty, mockPlatBusiness, mockPlatformPermitDetails } from '../mocks/mockedData'

const mockApplication = ref<any>(undefined)
const mockRegistration = ref<any>(undefined)
const mockPermitDetails = ref<any>(undefined)
const mockShowPermitDetails = ref(false)
const mockLoadPermitData = vi.fn()
// const mockLoadPermitRegistrationData = vi.fn()
const mockPostApplication = vi.fn()

mockNuxtImport('useStrrApi', () => () => ({
  postApplication: mockPostApplication
}))

mockNuxtImport('useStrrBasePermit', () => () => ({
  application: mockApplication,
  registration: mockRegistration,
  permitDetails: mockPermitDetails,
  showPermitDetails: mockShowPermitDetails,
  isPaidApplication: ref(false),
  downloadApplicationReceipt: vi.fn(),
  loadPermitData: mockLoadPermitData,
  loadPermitRegistrationData: vi.fn()
}))

describe('useStrrPlatformDetails store', () => {
  let store: any

  beforeEach(() => {
    store = useStrrPlatformDetails()
    store.$reset()
  })

  it('should start with one empty brand and no listingSize', () => {
    expect(store.platformDetails.brands).toHaveLength(1)
    expect(store.platformDetails.brands[0]).toEqual({ name: '', website: '' })
    expect(store.platformDetails.listingSize).toBeUndefined()
  })

  it('should append an empty brand', () => {
    store.addNewEmptyBrand()
    expect(store.platformDetails.brands).toHaveLength(2)
    expect(store.platformDetails.brands[1]).toEqual({ name: '', website: '' })
  })

  it('should remove a brand by index', () => {
    store.addNewEmptyBrand()
    store.platformDetails.brands[0]!.name = 'First'
    store.platformDetails.brands[1]!.name = 'Second'

    store.removeBrandAtIndex(0)

    expect(store.platformDetails.brands).toHaveLength(1)
    expect(store.platformDetails.brands[0]!.name).toBe('Second')
  })

  it('should not validate platform details with empty state', () => {
    expect(store.validatePlatformDetails(true)).toBe(false)
  })

  it('should validate platform details with a valid listingSize and brand', () => {
    store.platformDetails.listingSize = ListingSize.LESS_THAN_250
    store.platformDetails.brands[0]!.name = 'AirBnB'
    store.platformDetails.brands[0]!.website = 'https://airbnb.com'

    expect(store.validatePlatformDetails(true)).toBe(true)
  })

  it('should return an array of results from validatePlatformDetails', () => {
    const [result] = store.validatePlatformDetails(false) as any[]
    expect(result).toHaveProperty('success')
  })
})

describe('useStrrPlatformBusiness store', () => {
  let store: any

  beforeEach(() => {
    store = useStrrPlatformBusiness()
    store.platformBusiness = mockPlatBusiness
  })

  it('should validate platform business with valid data', () => {
    expect(store.validatePlatformBusiness(true)).toBe(true)
  })

  it('should return an array of successful results from validatePlatformBusiness', () => {
    const [result] = store.validatePlatformBusiness(false) as any[]
    expect(result).toHaveProperty('success', true)
  })

  it('should reset platform business fields to empty', () => {
    store.$reset()

    expect(store.platformBusiness.legalName).toBe('')
    expect(store.platformBusiness.cpbcLicenceNumber).toBe('')
    expect(store.platformBusiness.nonComplianceEmail).toBe('')
    expect(store.platformBusiness.hasCpbc).toBeUndefined()
  })
})

describe('useStrrPlatformApplication store', () => {
  let store: any

  beforeEach(() => {
    store = useStrrPlatformApplication()
    store.$reset()
  })

  it('should start with confirmation as false', () => {
    expect(store.platformConfirmation.confirmation).toBe(false)
  })

  it('should not validate confirmation when it is false', () => {
    expect(store.validatePlatformConfirmation(true)).toBe(false)
  })

  it('should validate confirmation when it is true', () => {
    store.platformConfirmation.confirmation = true
    expect(store.validatePlatformConfirmation(true)).toBe(true)
  })

  it('should return a successful array result from validatePlatformConfirmation', () => {
    store.platformConfirmation.confirmation = true
    const [result] = store.validatePlatformConfirmation(false) as any[]
    expect(result.success).toBe(true)
  })

  it('should submit a platform application and receive payment details', async () => {
    mockPostApplication.mockResolvedValueOnce({
      header: { paymentToken: 'TOKEN-123', applicationNumber: '1234567890', status: 'PAID' }
    })

    const result = await store.submitPlatformApplication()

    expect(mockPostApplication).toHaveBeenCalledOnce()
    expect(result.paymentToken).toBe('TOKEN-123')
    expect(result.filingId).toBe('1234567890')
    expect(result.applicationStatus).toBe('PAID')
  })
})

describe('useStrrPlatformStore', () => {
  let store: any

  beforeEach(() => {
    store = useStrrPlatformStore()
    store.$reset()
  })

  it('should start with no renewalRegId and isRegistrationRenewal as false', () => {
    expect(store.renewalRegId).toBeUndefined()
    expect(store.isRegistrationRenewal).toBe(false)
  })

  it('should reset to clear application and registration', () => {
    mockApplication.value = { header: { applicationNumber: '1234567890' } }
    mockRegistration.value = { id: 'H1234567890' }

    store.$reset()

    expect(store.application).toBeUndefined()
    expect(store.registration).toBeUndefined()
  })

  it('should reset all sub-stores together', () => {
    const businessStore = useStrrPlatformBusiness()
    const detailsStore = useStrrPlatformDetails()

    businessStore.platformBusiness = mockPlatBusiness
    detailsStore.platformDetails.listingSize = ListingSize.THOUSAND_AND_ABOVE

    store.$reset()

    expect(businessStore.platformBusiness.legalName).toBe('')
    expect(detailsStore.platformDetails.listingSize).toBeUndefined()
  })

  it('should load a platform and populate completingParty', async () => {
    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = {
        header: { applicationNumber: '0987654321', status: 'DRAFT' },
        registration: mockPlatformPermitDetails
      }
    })

    await store.loadPlatform('0987654321')

    expect(mockLoadPermitData).toHaveBeenCalledOnce()
    const { completingParty } = useStrrContactStore()
    expect(completingParty.firstName).toBe('Jane')
    expect(completingParty.lastName).toBe('Doe')
  })

  it('should populate platform details including primaryRep when showPermitDetails is true', async () => {
    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = {
        header: { applicationNumber: '0987654321', status: 'PAID' },
        registration: mockPlatformPermitDetails
      }
      mockPermitDetails.value = mockPlatformPermitDetails
    })
    mockShowPermitDetails.value = true

    await store.loadPlatform('0987654321')

    const contactStore = useStrrContactStore()
    expect(contactStore.primaryRep).toBeDefined()
    expect(contactStore.primaryRep!.firstName).toBe('Jane')
    expect(useStrrPlatformBusiness().platformBusiness.legalName).toBe('Acme Rentals Ltd.')
    expect(useStrrPlatformDetails().platformDetails.listingSize).toBe(ListingSize.LESS_THAN_250)
  })

  it('should set isCompletingPartyRep as true when rep matches completing party', async () => {
    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = {
        header: { applicationNumber: '0987654321', status: 'PAID' },
        registration: { ...mockPlatformPermitDetails, completingParty: mockApiParty }
      }
      mockPermitDetails.value = {
        ...mockPlatformPermitDetails,
        platformRepresentatives: [{ ...mockApiParty, jobTitle: 'Owner' }]
      }
    })
    mockShowPermitDetails.value = true

    await store.loadPlatform('0987654321')

    expect(useStrrContactStore().isCompletingPartyRep).toBe(true)
  })
})
