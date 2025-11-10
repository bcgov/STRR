import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import { mockApplication } from '../mocks/mockedData'
import { SummaryProperty } from '#components'

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: () => ({
    unitAddress: ref({
      address: {
        nickname: mockApplication.registration!.unitAddress!.nickname,
        streetAddress: `${mockApplication.registration!.unitAddress!.streetNumber} ${
          mockApplication.registration!.unitAddress!.streetName
        }`,
        city: mockApplication.registration!.unitAddress!.city,
        province: mockApplication.registration!.unitAddress!.province,
        postalCode: mockApplication.registration!.unitAddress!.postalCode,
        country: mockApplication.registration!.unitAddress!.country
      }
    }),
    unitDetails: ref({
      propertyType: mockApplication.registration!.unitDetails!.propertyType,
      typeOfSpace: mockApplication.registration!.unitDetails!.rentalUnitSpaceType,
      rentalUnitSetupType: mockApplication.registration!.unitDetails!.rentalUnitSpaceType,
      numberOfRoomsForRent: mockApplication.registration!.unitDetails!.numberOfRoomsForRent!.toString(),
      ownershipType: mockApplication.registration!.unitDetails!.ownershipType,
      parcelIdentifier: mockApplication.registration!.unitDetails!.parcelIdentifier
    }),
    blInfo: ref({
      businessLicense: mockApplication.registration!.unitDetails!.businessLicense,
      businessLicenseExpiryDate: '2025-01-01'
    })
  })
}))

vi.mock('@/stores/propertyRequirements', () => ({
  usePropertyReqStore: () => ({
    prRequirements: ref({
      isPropertyPrExempt: true,
      prExemptionReason: 'STRATA_HOTEL'
    }),
    blRequirements: ref({
      isBusinessLicenceExempt: true,
      blExemptReason: 'test bl exemption reason'
    }),
    strataHotelCategory: ref({
      category: 'STRATA_HOTEL'
    })
  })
}))

vi.mock('@/composables/useHostFeatureFlags', () => ({
  useHostFeatureFlags: () => ({
    isNewAddressFormEnabled: ref(false),
    isNewRentalUnitSetupEnabled: ref(false)
  })
}))

describe('SummaryProperty Component', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(SummaryProperty, {
      global: { plugins: [baseEnI18n] }
    })
  })

  it('displays property details correctly', () => {
    expect(wrapper.html()).toContain('propertyType.CONDO_OR_APT')
    expect(wrapper.html()).toContain('rentalUnitType.ENTIRE_HOME')
  })

  it('handles PR exemption correctly', () => {
    expect(wrapper.html()).toContain('label.prExemption')
    expect(wrapper.html()).toContain('label.prExemptionReason')
  })

  it('handles BL exemption correctly', () => {
    expect(wrapper.html()).toContain('label.blExemption')
    expect(wrapper.html()).toContain('label.blExemptionReason')
  })

  it('displays strata hotel info when applicable', () => {
    expect(wrapper.html()).toContain('strataHotelCategoryReview.STRATA_HOTEL')
  })
})
