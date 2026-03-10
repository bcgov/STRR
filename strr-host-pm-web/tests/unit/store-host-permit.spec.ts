import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { mockHostRegistration, mockApplication } from '../mocks/mockedData'

const hostOwners = ref<HostOwner[]>([])
const mockOwnerReset = vi.fn(() => { hostOwners.value = [] })

vi.mock('@/stores/hostOwner', () => ({
  useHostOwnerStore: () => ({
    hostOwners,
    $reset: mockOwnerReset
  })
}))

const unitDetails = ref<Record<string, any>>({})
const blInfo = ref<Record<string, any>>({})
const unitAddress = ref<Record<string, any>>({ address: {} })
const mockPropertyReset = vi.fn(() => {
  unitDetails.value = {}
  blInfo.value = {}
  unitAddress.value = { address: {} }
})

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: () => ({
    unitDetails,
    blInfo,
    unitAddress,
    $reset: mockPropertyReset
  })
}))

const prRequirements = ref<Record<string, any>>({ isPropertyPrExempt: false, prExemptionReason: undefined })
const propertyReqs = ref<Record<string, any>>({})
const blRequirements = ref<Record<string, any>>({ isBusinessLicenceExempt: false, blExemptReason: undefined })
const showUnitDetailsForm = ref(false)
const strataHotelCategory = ref<Record<string, any>>({ category: undefined, strataHotelRegistrationNumber: '' })
const mockGetPropertyReqs = vi.fn()

vi.mock('@/stores/propertyRequirements', () => ({
  usePropertyReqStore: () => ({
    prRequirements,
    propertyReqs,
    blRequirements,
    showUnitDetailsForm,
    strataHotelCategory,
    getPropertyReqs: mockGetPropertyReqs
  })
}))

const storedDocuments = ref<UiDocument[]>([])
const mockDocumentReset = vi.fn(() => { storedDocuments.value = [] })

vi.mock('@/stores/document', () => ({
  useDocumentStore: () => ({
    storedDocuments,
    $reset: mockDocumentReset
  })
}))

const mockApplicationRef = ref<HostApplicationResp | undefined>(undefined)
const mockRegistrationRef = ref<HostRegistrationResp | undefined>(undefined)
const mockShowPermitDetails = ref(false)
const mockLoadPermitData = vi.fn()
const mockLoadPermitRegistrationData = vi.fn()
mockNuxtImport('useStrrBasePermit', () => () => ({
  application: mockApplicationRef,
  registration: mockRegistrationRef,
  permitDetails: computed(() => mockRegistrationRef.value ?? (mockApplicationRef.value?.registration as any)),
  isPaidApplication: computed(() => false),
  showPermitDetails: mockShowPermitDetails,
  loadPermitData: mockLoadPermitData,
  loadPermitRegistrationData: mockLoadPermitRegistrationData,
  downloadApplicationReceipt: vi.fn(),
  downloadRegistrationCert: vi.fn()
}))

const isBusinessLicenseDocumentUploadEnabled = ref(false)

mockNuxtImport('useHostFeatureFlags', () => () => ({
  isBusinessLicenseDocumentUploadEnabled
}))

function resetAllState () {
  useHostPermitStore().$reset()

  // reset propertyReqStore - not covered by store $reset()
  prRequirements.value = { isPropertyPrExempt: false, prExemptionReason: undefined }
  propertyReqs.value = {}
  blRequirements.value = { isBusinessLicenceExempt: false, blExemptReason: undefined }
  showUnitDetailsForm.value = false
  strataHotelCategory.value = { category: undefined, strataHotelRegistrationNumber: '' }

  // mock-only state
  mockShowPermitDetails.value = false
  isBusinessLicenseDocumentUploadEnabled.value = false
  vi.clearAllMocks()

  // mock base permit composable so loadHostData has permit details after $reset()
  mockLoadPermitData.mockImplementation(() => {
    mockApplicationRef.value = mockApplication
    mockRegistrationRef.value = mockHostRegistration
  })
}

describe('useHostPermitStore - business license requirement', () => {
  beforeEach(resetAllState)

  const makeApplicationData = (overrides: Record<string, any> = {}) => ({
    header: { registrationStatus: RegistrationStatus.ACTIVE, ...overrides.header },
    registration: {
      strRequirements: { organizationNm: 'City of Kelowna' },
      ...overrides.registration
    }
  })

  it('should return false when feature flag is disabled', () => {
    isBusinessLicenseDocumentUploadEnabled.value = false
    mockRegistrationRef.value = {
      ...mockHostRegistration,
      status: RegistrationStatus.ACTIVE,
      unitDetails: { ...mockHostRegistration.unitDetails, jurisdiction: 'City of Kelowna' }
    } as HostRegistrationResp
    expect(useHostPermitStore().needsBusinessLicenseDocumentUpload).toBe(false)
  })

  it('should return false when registration is undefined', () => {
    isBusinessLicenseDocumentUploadEnabled.value = true
    mockRegistrationRef.value = undefined
    expect(useHostPermitStore().needsBusinessLicenseDocumentUpload).toBe(false)
  })

  it('should return false when registration status is not ACTIVE', () => {
    isBusinessLicenseDocumentUploadEnabled.value = true
    mockRegistrationRef.value = {
      ...mockHostRegistration,
      status: RegistrationStatus.CANCELLED,
      unitDetails: { ...mockHostRegistration.unitDetails, jurisdiction: 'City of Kelowna' }
    }as HostRegistrationResp
    expect(useHostPermitStore().needsBusinessLicenseDocumentUpload).toBe(false)
  })

  it('should return false when jurisdiction is not an affected municipality', () => {
    isBusinessLicenseDocumentUploadEnabled.value = true
    mockRegistrationRef.value = {
      ...mockHostRegistration,
      status: RegistrationStatus.ACTIVE,
      unitDetails: { ...mockHostRegistration.unitDetails, jurisdiction: 'City of Vancouver' }
    } as HostRegistrationResp
    expect(useHostPermitStore().needsBusinessLicenseDocumentUpload).toBe(false)

    mockRegistrationRef.value = {
      ...mockHostRegistration,
      status: RegistrationStatus.ACTIVE,
      unitDetails: { ...mockHostRegistration.unitDetails, jurisdiction: undefined }
    } as HostRegistrationResp
    expect(useHostPermitStore().needsBusinessLicenseDocumentUpload).toBe(false)
  })

  it('should return true when all conditions are met', () => {
    isBusinessLicenseDocumentUploadEnabled.value = true
    mockRegistrationRef.value = {
      ...mockHostRegistration,
      status: RegistrationStatus.ACTIVE,
      unitDetails: { ...mockHostRegistration.unitDetails, jurisdiction: 'City of Kelowna' }
    } as HostRegistrationResp
    expect(useHostPermitStore().needsBusinessLicenseDocumentUpload).toBe(true)
  })

  it('should return false from checkBusinessLicenseRequirement when feature flag is disabled', () => {
    isBusinessLicenseDocumentUploadEnabled.value = false
    expect(useHostPermitStore().checkBusinessLicenseRequirement(makeApplicationData())).toBe(false)
  })

  it('should return true from checkBusinessLicenseRequirement when all conditions are met', () => {
    isBusinessLicenseDocumentUploadEnabled.value = true
    expect(useHostPermitStore().checkBusinessLicenseRequirement(makeApplicationData())).toBe(true)
  })
})

describe('useHostPermitStore - loading host data', () => {
  beforeEach(() => {
    resetAllState()
    // Default: set registration after loadPermitRegistrationData is called
    mockLoadPermitRegistrationData.mockImplementation(() => {
      mockRegistrationRef.value = mockHostRegistration
    })
  })

  it('should call loadPermitData with correct arguments', async () => {
    await useHostPermitStore().loadHostData('1234567890')
    expect(mockLoadPermitData).toHaveBeenCalledWith('1234567890', undefined, false)

    await useHostPermitStore().loadHostData('1234567890', false, true)
    expect(mockLoadPermitData).toHaveBeenCalledWith('1234567890', undefined, true)
  })

  it('should call populateHostDetails when showPermitDetails is true', async () => {
    mockShowPermitDetails.value = true
    await useHostPermitStore().loadHostData('1234567890')
    expect(hostOwners.value.length).toBeGreaterThan(0)
  })

  it('should call populateHostDetails when loadDraft is true regardless of showPermitDetails', async () => {
    mockShowPermitDetails.value = false
    await useHostPermitStore().loadHostData('1234567890', true)
    expect(hostOwners.value.length).toBeGreaterThan(0)
  })

  it('should populate hostOwners with primaryContact as HOST', async () => {
    await useHostPermitStore().loadHostRegistrationData('H847293615')
    expect(hostOwners.value).toHaveLength(1)
    expect(hostOwners.value[0]!.role).toBe(OwnerRole.HOST)
    expect(hostOwners.value[0]!.firstName).toBe(mockHostRegistration.primaryContact!.firstName)
    expect(hostOwners.value[0]!.lastName).toBe(mockHostRegistration.primaryContact!.lastName)
  })

  it('should populate hostOwners with secondaryContact as CO_HOST', async () => {
    const secondaryContact = {
      contactType: OwnerType.INDIVIDUAL,
      firstName: 'Bob',
      lastName: 'Jones',
      emailAddress: 'bob@example.com',
      mailingAddress: mockHostRegistration.primaryContact!.mailingAddress
    } as ApiHostContactPerson

    mockLoadPermitRegistrationData.mockImplementationOnce(() => {
      mockRegistrationRef.value = { ...mockHostRegistration, secondaryContact }
    })

    await useHostPermitStore().loadHostRegistrationData('H847293615')

    const coHost = hostOwners.value.find(o => o.role === OwnerRole.CO_HOST)
    expect(coHost).toBeDefined()
    expect(coHost!.firstName).toBe('Bob')
    expect(coHost!.lastName).toBe('Jones')
  })

  it('should populate hostOwners with propertyManager as PROPERTY_MANAGER', async () => {
    const propertyManager = {
      initiatedByPropertyManager: false,
      propertyManagerType: OwnerType.INDIVIDUAL,
      contact: {
        firstName: 'Carol',
        lastName: 'White',
        emailAddress: 'carol@example.com',
        mailingAddress: mockHostRegistration.primaryContact!.mailingAddress
      }
    } as ApiPropertyManager

    mockLoadPermitRegistrationData.mockImplementationOnce(() => {
      mockRegistrationRef.value = { ...mockHostRegistration, propertyManager }
    })

    await useHostPermitStore().loadHostRegistrationData('H847293615')

    const pm = hostOwners.value.find(owner => owner.role === OwnerRole.PROPERTY_MANAGER)
    expect(pm).toBeDefined()
    expect(pm!.lastName).toBe('White')
  })

  it('should populate all property data from registration', async () => {
    await useHostPermitStore().loadHostRegistrationData('H847293615')
    expect(unitDetails.value.propertyType).toBe(mockHostRegistration.unitDetails!.propertyType)
    expect(unitDetails.value.parcelIdentifier).toBe(mockHostRegistration.unitDetails!.parcelIdentifier)
    expect(blInfo.value.businessLicense).toBe(mockHostRegistration.unitDetails!.businessLicense)
    expect(unitAddress.value.address.streetName).toBe(mockHostRegistration.unitAddress!.streetName)
    expect(unitAddress.value.address.streetNumber).toBe(mockHostRegistration.unitAddress!.streetNumber)
    expect(unitAddress.value.address.city).toBe(mockHostRegistration.unitAddress!.city)
    expect(showUnitDetailsForm.value).toBe(true)
  })

  it('should set prRequirements when prExemptReason is present', async () => {
    mockLoadPermitRegistrationData.mockImplementationOnce(() => {
      mockRegistrationRef.value = {
        ...mockHostRegistration,
        unitDetails: { ...mockHostRegistration.unitDetails, prExemptReason: 'Farm Land' }
      } as unknown as HostRegistrationResp
    })

    await useHostPermitStore().loadHostRegistrationData('H847293615')

    expect(prRequirements.value.isPropertyPrExempt).toBe(true)
    expect(prRequirements.value.prExemptionReason).toBe('Farm Land')
  })

  it('should set blRequirements when blExemptReason is present', async () => {
    mockLoadPermitRegistrationData.mockImplementationOnce(() => {
      mockRegistrationRef.value = {
        ...mockHostRegistration,
        unitDetails: { ...mockHostRegistration.unitDetails, blExemptReason: 'Over 30 days' }
      } as unknown as HostRegistrationResp
    })

    await useHostPermitStore().loadHostRegistrationData('H847293615')

    expect(blRequirements.value.isBusinessLicenceExempt).toBe(true)
    expect(blRequirements.value.blExemptReason).toBe('Over 30 days')
  })

  it('should populate storedDocuments from documents when not a renewal', async () => {
    const docWithMeta = {
      ...mockHostRegistration.documents![0]!,
      uploadStep: DocumentUploadStep.APPLICATION,
      uploadDate: '2025-01-01'
    }
    mockLoadPermitRegistrationData.mockImplementationOnce(() => {
      mockRegistrationRef.value = { ...mockHostRegistration, documents: [docWithMeta] }
    })

    await useHostPermitStore().loadHostRegistrationData('H847293615', false)

    expect(storedDocuments.value).toHaveLength(1)
    expect(storedDocuments.value[0]!.name).toBe(docWithMeta.fileName)
    expect(storedDocuments.value[0]!.type).toBe(docWithMeta.documentType)
    expect(storedDocuments.value[0]!.apiDoc).toEqual(docWithMeta)
    expect(storedDocuments.value[0]!.loading).toBe(false)
    expect(storedDocuments.value[0]!.uploadStep).toBe(DocumentUploadStep.APPLICATION)
    expect(storedDocuments.value[0]!.uploadDate).toBe('2025-01-01')
  })

  it('should set storedDocuments to empty array for renewal', async () => {
    await useHostPermitStore().loadHostRegistrationData('H847293615', true)
    expect(storedDocuments.value).toHaveLength(0)
  })
})
