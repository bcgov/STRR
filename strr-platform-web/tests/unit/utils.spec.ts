import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { vi, describe, beforeEach, it, expect } from 'vitest'
import {
  mockApiAddress,
  mockEmptyApiAddress,
  mockPlatBusiness,
  mockApiPlatformBusiness,
  mockPlatformDetails,
  mockPlatformDetailsMultiBrand
} from '../mocks/mockedData'

const mockSideDetails = ref<{ label: string, value: string }[]>([])

mockNuxtImport('useConnectDetailsHeaderStore', () => () => ({
  sideDetails: mockSideDetails
}))

describe('formatBusinessDetails functions', () => {
  it('should map required fields to API format', () => {
    const result = formatBusinessDetails(mockPlatBusiness)
    expect(result.consumerProtectionBCLicenceNumber).toBe('12345')
    expect(result.noticeOfNonComplianceEmail).toBe('nc@example.com')
    expect(result.takeDownRequestEmail).toBe('td@example.com')
    expect(result.mailingAddress.address).toBe('123 Main St')
    expect(result.mailingAddress.city).toBe('Victoria')
    expect(result.mailingAddress.province).toBe('BC')
  })

  it('should omit optional email fields when empty', () => {
    const result = formatBusinessDetails({
      ...mockPlatBusiness,
      nonComplianceEmailOptional: '',
      takeDownEmailOptional: ''
    })
    expect(result).not.toHaveProperty('noticeOfNonComplianceOptionalEmail')
    expect(result).not.toHaveProperty('takeDownRequestOptionalEmail')
  })

  it('should include optional email fields when non-empty', () => {
    const result = formatBusinessDetails({
      ...mockPlatBusiness,
      nonComplianceEmailOptional: '1111@example.com',
      takeDownEmailOptional: '2222@example.com'
    })
    expect(result.noticeOfNonComplianceOptionalEmail).toBe('1111@example.com')
    expect(result.takeDownRequestOptionalEmail).toBe('2222@example.com')
  })
})

describe('formatBusinessDetailsUI functions', () => {
  it('should set hasCpbc based on consumerProtectionBCLicenceNumber', () => {
    expect(formatBusinessDetailsUI(mockApiPlatformBusiness).hasCpbc).toBe(true)
    const noLicence = formatBusinessDetailsUI({ ...mockApiPlatformBusiness, consumerProtectionBCLicenceNumber: '' })
    expect(noLicence.hasCpbc).toBe(false)
  })

  it('should set hasRegOffAtt based on attorneyName', () => {
    const withAttorney = formatBusinessDetailsUI({
      ...mockApiPlatformBusiness,
      registeredOfficeOrAttorneyForServiceDetails: { attorneyName: 'John Smith', mailingAddress: mockEmptyApiAddress }
    })
    expect(withAttorney.hasRegOffAtt).toBe(true)
    expect(formatBusinessDetailsUI(mockApiPlatformBusiness).hasRegOffAtt).toBe(false)
  })

  it('should default optional email fields to empty string when absent', () => {
    const result = formatBusinessDetailsUI(mockApiPlatformBusiness)
    expect(result.nonComplianceEmailOptional).toBe('')
    expect(result.takeDownEmailOptional).toBe('')
  })

  it('should map noticeOfNonComplianceOptionalEmail to nonComplianceEmailOptional', () => {
    const result = formatBusinessDetailsUI({
      ...mockApiPlatformBusiness,
      noticeOfNonComplianceOptionalEmail:
      '11122@example.com'
    })
    expect(result.nonComplianceEmailOptional).toBe('11122@example.com')
  })

  it('should set sameAsMailAddress to true when reg office address matches mailing address', () => {
    const result = formatBusinessDetailsUI({
      ...mockApiPlatformBusiness,
      registeredOfficeOrAttorneyForServiceDetails: { attorneyName: '', mailingAddress: mockApiAddress }
    })
    expect(result.regOfficeOrAtt.sameAsMailAddress).toBe(true)
  })
})

describe('formatPlatformDetails', () => {
  it('should map brands and listingSize correctly', () => {
    const result = formatPlatformDetails(mockPlatformDetails)
    expect(result.brands).toHaveLength(1)
    expect(result.brands[0]!.name).toBe('AirBnB')
    expect(result.brands[0]!.website).toBe('https://airbnb.com')
    expect(result.listingSize).toBe(ListingSize.LESS_THAN_250)
  })

  it('should map multiple brands correctly', () => {
    const result = formatPlatformDetails(mockPlatformDetailsMultiBrand)
    expect(result.brands).toHaveLength(2)
    expect(result.brands[1]!.name).toBe('VRBO')
  })
})

describe('setPlatformSideHeaderDetails', () => {
  beforeEach(() => {
    mockSideDetails.value = []
    useStrrPlatformBusiness().$reset()
  })

  it('should push business number to sideDetails when present', () => {
    useStrrPlatformBusiness().platformBusiness.businessNumber = '123456789'
    setPlatformSideHeaderDetails()
    expect(mockSideDetails.value.some(d => d.value === '123456789')).toBe(true)
  })

  it('should push CPBC licence number to sideDetails when present', () => {
    useStrrPlatformBusiness().platformBusiness.cpbcLicenceNumber = '12345'
    setPlatformSideHeaderDetails()
    expect(mockSideDetails.value.some(d => d.value === '12345')).toBe(true)
  })

  it('should not push anything when both fields are empty', () => {
    setPlatformSideHeaderDetails()
    expect(mockSideDetails.value).toHaveLength(0)
  })
})
