import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApplication } from '../mocks/mockedData'

const { getApplication } = vi.hoisted(() => ({ getApplication: vi.fn() }))

mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplication: getApplication,
  getAccountRegistrations: vi.fn(),
  searchRegistrations: vi.fn(),
  getApplicationReceipt: vi.fn(),
  getRegistrationCert: vi.fn(),
  updatePaymentDetails: vi.fn()
}))

const draft = (registration: Record<string, unknown>) => ({
  header: { applicationNumber: '12345678901234', status: ApplicationStatus.DRAFT },
  registration: { registrationType: ApplicationType.HOST, ...registration }
})

describe('incomplete Host draft loading', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getApplication.mockReset()
  })

  it.each([
    { label: 'omitted property data', registration: {} },
    { label: 'empty property data', registration: { unitAddress: {}, unitDetails: {} } },
    { label: 'a partial address', registration: { unitAddress: { city: 'Victoria' } } }
  ])('loads $label into editable property defaults', async ({ registration }) => {
    getApplication.mockResolvedValue(draft(registration))
    const property = useHostPropertyStore()
    const expectedAddress = property.getEmptyUnitAddress().address

    await useHostPermitStore().loadHostData('12345678901234', true)

    expect(getApplication).toHaveBeenCalledWith('12345678901234', undefined)
    expect(property.unitAddress.address).toEqual({
      ...expectedAddress,
      ...(registration.unitAddress || {})
    })
    expect(property.unitDetails.propertyType).toBeUndefined()
    expect(property.blInfo.businessLicense).toBe('')
    expect(usePropertyReqStore().showUnitDetailsForm).toBe(false)
    expect(useHostOwnerStore().hostOwners).toEqual([])
    expect(useDocumentStore().storedDocuments).toEqual([])
  })

  it('preserves a complete saved address and property details', async () => {
    const registration = structuredClone(mockApplication.registration)
    getApplication.mockResolvedValue(draft(registration))

    await useHostPermitStore().loadHostData('12345678901234', true)

    const property = useHostPropertyStore()
    expect(property.unitAddress.address.city).toBe(registration.unitAddress!.city)
    expect(property.unitAddress.address.streetName).toBe(registration.unitAddress!.streetName)
    expect(property.unitAddress.address.streetNumber).toBe(registration.unitAddress!.streetNumber)
    expect(property.unitDetails.propertyType).toBe(registration.unitDetails!.propertyType)
    expect(property.blInfo.businessLicense).toBe(registration.unitDetails!.businessLicense || '')
  })

  it('clears a previously loaded address and exemptions before loading an incomplete draft', async () => {
    const previous = {
      ...structuredClone(mockApplication.registration),
      unitDetails: {
        ...mockApplication.registration.unitDetails,
        prExemptReason: 'FARM_LAND',
        blExemptReason: 'Saved exemption',
        strataHotelRegistrationNumber: 'S123456789'
      }
    }
    getApplication.mockResolvedValueOnce(draft(previous)).mockResolvedValueOnce(draft({}))
    const permit = useHostPermitStore()
    await permit.loadHostData('12345678901234', true)
    expect(usePropertyReqStore().prRequirements.isPropertyPrExempt).toBe(true)

    await permit.loadHostData('23456789012345', true)

    const property = useHostPropertyStore()
    const requirements = usePropertyReqStore()
    expect(property.unitAddress).toEqual(property.getEmptyUnitAddress())
    expect(property.blInfo.businessLicense).toBe('')
    expect(requirements.prRequirements.isPropertyPrExempt).toBe(false)
    expect(requirements.prRequirements.prExemptionReason).toBeUndefined()
    expect(requirements.blRequirements.isBusinessLicenceExempt).toBe(false)
    expect(requirements.blRequirements.blExemptReason).toBe('')
    expect(requirements.strataHotelCategory.strataHotelRegistrationNumber).toBe('')
    expect(requirements.showUnitDetailsForm).toBe(false)
  })
})
