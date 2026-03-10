import { describe, it, expect, vi } from 'vitest'
import {
  mockApiDocuments,
  mockHostOwner,
  mockHostRegistration,
  mockPropertyReqs,
  mockUnitAddress
} from '../mocks/mockedData'

const mockCoHost: HostOwner = { ...mockHostOwner, role: OwnerRole.CO_HOST }
const mockPropertyManager: HostOwner = { ...mockHostOwner, role: OwnerRole.PROPERTY_MANAGER }

const hostOwners = ref<HostOwner[]>([mockHostOwner])
const mockFindByRole = vi.fn((role: OwnerRole) => hostOwners.value.find(val => val.role === role))

vi.mock('@/stores/hostOwner', () => ({
  useHostOwnerStore: () => ({
    findByRole: mockFindByRole,
    hostOwners
  })
}))

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: () => ({
    unitAddress: { address: mockUnitAddress },
    unitDetails: {
      propertyType: PropertyType.CONDO_OR_APT,
      parcelIdentifier: '123-456-789',
      hostType: PropertyHostType.OWNER
    },
    blInfo: { businessLicense: '', businessLicenseExpiryDate: '' }
  })
}))

vi.mock('@/stores/propertyRequirements', () => ({
  usePropertyReqStore: () => ({
    propertyReqs: mockPropertyReqs,
    prRequirements: { isPropertyPrExempt: false, prExemptionReason: undefined },
    blRequirements: { isBusinessLicenceExempt: false, blExemptReason: undefined },
    strataHotelCategory: { category: undefined, strataHotelRegistrationNumber: undefined }
  })
}))

vi.mock('@/stores/document', () => ({
  useDocumentStore: () => ({
    apiDocuments: mockApiDocuments
  })
}))

const isRegistrationRenewal = ref(false)

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => ({
    isRegistrationRenewal,
    registration: ref(mockHostRegistration),
    application: ref(undefined)
  })
}))

describe('Store - Host Application', () => {
  it('should createApplicationBody with registration and header data', () => {
    const body = useHostApplicationStore().createApplicationBody()

    expect(body.registration.registrationType).toBe(ApplicationType.HOST)
    expect(body.registration.documents).toEqual(mockApiDocuments)
    expect(body.registration.strRequirements).toEqual(mockPropertyReqs)
    expect(body.registration.listingDetails).toEqual([])
    expect(body.registration.unitAddress!.streetName).toBe('Government St')
    expect(body.registration.unitAddress!.streetNumber).toBe('789')
    expect(body.registration.unitAddress!.city).toBe('Victoria')
    expect(body.registration.unitAddress!.nickname).toBe('Harbour View Unit')
    expect(body.registration.unitDetails!.propertyType).toBe(PropertyType.CONDO_OR_APT)
    expect(body.registration.unitDetails!.parcelIdentifier).toBe('123-456-789')
    expect(body.header.paymentMethod).toBe(ConnectPaymentMethod.DIRECT_PAY)
  })

  it('should createApplicationBody for host (primaryContact)', () => {
    const body = useHostApplicationStore().createApplicationBody()
    expect(body.registration.secondaryContact).toBeUndefined()
    expect(body.registration.propertyManager).toBeUndefined()

    const primary = body.registration.primaryContact as ApiHostContactPerson
    expect(primary).toBeDefined()
    expect(primary.firstName).toBe(mockHostOwner.firstName)
    expect(primary.lastName).toBe(mockHostOwner.lastName)
    expect(primary.emailAddress).toBe(mockHostOwner.emailAddress)
    expect(primary.contactType).toBe(mockHostOwner.ownerType)
    expect(primary.dateOfBirth).toBe(mockHostOwner.dateOfBirth)
    expect(primary.mailingAddress.city).toBe(mockHostOwner.mailingAddress.city)
  })

  it('should createApplicationBody for host (primaryContact) and co-host (secondaryContact)', () => {
    // setup host and co-host
    hostOwners.value = [mockHostOwner, mockCoHost]

    const body = useHostApplicationStore().createApplicationBody()
    expect(body.registration.propertyManager).toBeUndefined()

    expect(body.registration.primaryContact).toBeDefined()

    const secondary = body.registration.secondaryContact as ApiHostContactPerson
    expect(secondary).toBeDefined()
    expect(secondary.firstName).toBe(mockCoHost.firstName)
    expect(secondary.lastName).toBe(mockCoHost.lastName)
    expect(secondary.emailAddress).toBe(mockCoHost.emailAddress)
    expect(secondary.contactType).toBe(mockCoHost.ownerType)
  })

  it('should createApplicationBody for host (primaryContact) and propertyManager', () => {
    // setup host and property manager
    hostOwners.value = [mockHostOwner, mockPropertyManager]

    const body = useHostApplicationStore().createApplicationBody()
    expect(body.registration.secondaryContact).toBeUndefined()

    expect(body.registration.primaryContact).toBeDefined()

    const pm = body.registration.propertyManager
    expect(pm).toBeDefined()
    expect(pm!.initiatedByPropertyManager).toBe(mockPropertyManager.isCompParty)
    expect(pm!.propertyManagerType).toBe(mockPropertyManager.ownerType)
    const pmContact = pm!.contact as ApiParty
    expect(pmContact.lastName).toBe(mockPropertyManager.lastName)
    expect(pmContact.emailAddress).toBe(mockPropertyManager.emailAddress)
  })

  it('should createApplicationBody with renewal header fields when isRegistrationRenewal is true', () => {
    isRegistrationRenewal.value = true

    const body = useHostApplicationStore().createApplicationBody()
    const header = body.header as Record<string, unknown>

    expect(header.applicationType).toBe('renewal')
    expect(header.registrationId).toBe(mockHostRegistration.id)
  })
})
