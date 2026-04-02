import { describe, it, expect } from 'vitest'
import {
  mockAddress,
  mockApiAddress,
  mockApiStrataDetails,
  mockBusinessDetails,
  mockStrataDetails
} from '../mocks/mockedData'

describe('Strata Formatting utils', () => {
  it('formatStrataDetails: map StrataDetails fields to ApiStrataDetails format', () => {
    const input = {
      brand: { name: 'Grand Hotel', website: 'https://grand.com' },
      buildings: [{ ...mockAddress, street: '456 Oak Ave', streetAdditional: '' }],
      location: mockAddress,
      numberOfUnits: 8,
      category: StrataHotelCategory.FULL_SERVICE,
      unitListings: { primary: 'Penthouse', additional: ['Room 101'] }
    }

    const result = formatStrataDetails(input)

    expect(result.location.address).toBe('123 Main St')
    expect(result.location.city).toBe('Victoria')
    expect(result.buildings).toHaveLength(1)
    expect(result.buildings[0]!.address).toBe('456 Oak Ave')
    expect(result.unitListings?.additional).toHaveLength(1)
  })

  it('formatStrataDetails: truncate additional unit listings to match building count', () => {
    const input = { ...mockStrataDetails, unitListings: { primary: '', additional: ['Room A', 'Room B'] } }

    const result = formatStrataDetails(input)

    expect(result.unitListings?.additional).toHaveLength(0)
  })

  it('formatStrataDetailsUI: map ApiStrataDetails fields to StrataDetails format', () => {
    const input = {
      brand: { name: 'Sea View', website: '' },
      buildings: [{ ...mockApiAddress, address: '10 Ocean Blvd', addressLineTwo: '' }],
      location: mockApiAddress,
      numberOfUnits: 15,
      category: StrataHotelCategory.MULTI_UNIT_NON_PR,
      unitListings: { primary: 'Suite 1', additional: ['Apt A'] }
    }

    const result = formatStrataDetailsUI(input)

    expect(result.location.street).toBe('123 Main St')
    expect(result.buildings).toHaveLength(1)
    expect(result.buildings[0]!.street).toBe('10 Ocean Blvd')
  })

  it('formatStrataDetailsUI: pad additional unit listings to match building count when too short', () => {
    const input = { ...mockApiStrataDetails, unitListings: { primary: '', additional: [] } } // 0 entries but 2 buildings

    const result = formatStrataDetailsUI(input)

    expect(result.unitListings.additional).toHaveLength(2)
    expect(result.unitListings.additional).toEqual(['', ''])
  })

  it('formatBusinessDetails: map StrrBusiness to ApiBusinessDetails format', () => {
    const input = {
      legalName: 'Acme Corp',
      homeJurisdiction: 'BC',
      businessNumber: '987654321',
      mailingAddress: mockAddress,
      hasRegOffAtt: false,
      regOfficeOrAtt: {
        attorneyName: 'John Smith',
        sameAsMailAddress: false,
        mailingAddress: { ...mockAddress, street: '789 Elm St' }
      }
    }

    const result = formatBusinessDetails(input)

    expect(result.mailingAddress.address).toBe('123 Main St')
    expect(result.registeredOfficeOrAttorneyForServiceDetails.attorneyName).toBe('John Smith')
    expect(result.registeredOfficeOrAttorneyForServiceDetails.mailingAddress.address).toBe('789 Elm St')
  })

  it('formatBusinessDetailsUI: set hasRegOffAtt to true when attorney name is present', () => {
    const input = {
      ...mockBusinessDetails,
      registeredOfficeOrAttorneyForServiceDetails: {
        attorneyName: 'Jane Doe',
        mailingAddress: { ...mockApiAddress, address: '' }
      }
    }

    const result = formatBusinessDetailsUI(input)

    expect(result.hasRegOffAtt).toBe(true)
    expect(result.regOfficeOrAtt.attorneyName).toBe('Jane Doe')
  })

  it('formatBusinessDetailsUI: set hasRegOffAtt to false when no attorney name or address fields are set', () => {
    const result = formatBusinessDetailsUI(mockBusinessDetails)

    expect(result.hasRegOffAtt).toBe(false)
  })

  it('formatStrataUnitAddressLines: return empty array when address is undefined', () => {
    expect(formatStrataUnitAddressLines(undefined)).toEqual([])
  })

  it('formatStrataUnitAddressLines: return non-empty lines for a valid address', () => {
    const lines = formatStrataUnitAddressLines(mockAddress as any)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.some(l => l.includes('Main St'))).toBe(true)
  })

  it('buildStrataUnitListingGroups: return empty array when no units are set', () => {
    const labels = {
      primaryLabel: 'Primary Hotel',
      buildingLabel: (i: number) => `Building ${i + 2}`
    }
    const details = {
      buildings: [],
      location: { street: '', city: '', region: 'BC', postalCode: '', country: 'CA' },
      unitListings: { primary: '', additional: [] }
    }
    expect(buildStrataUnitListingGroups(details as any, labels)).toHaveLength(0)
  })

  it('buildStrataUnitListingGroups: include a primary group when primary units are defined', () => {
    const labels = {
      primaryLabel: 'Primary Hotel',
      buildingLabel: (i: number) => `Building ${i + 2}`
    }
    const details = {
      buildings: [],
      location: mockAddress,
      unitListings: { primary: 'Suite 1\nSuite 2', additional: [] }
    }
    const groups = buildStrataUnitListingGroups(details as any, labels)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.id).toBe('primary')
    expect(groups[0]!.label).toBe('Primary Hotel')
    expect(groups[0]!.units).toEqual(['Suite 1', 'Suite 2'])
  })

  it('buildStrataUnitListingGroups: include a building group for each additional unit entry', () => {
    const labels = {
      primaryLabel: 'Primary Hotel',
      buildingLabel: (i: number) => `Building ${i + 2}`
    }
    const details = {
      buildings: [{ ...mockAddress, street: '10 Park Rd' }],
      location: { street: '', city: '', region: 'BC', postalCode: '', country: 'CA' },
      unitListings: { primary: '', additional: ['Room A\nRoom B'] }
    }
    const groups = buildStrataUnitListingGroups(details as any, labels)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.id).toBe('building-0')
    expect(groups[0]!.label).toBe('Building 2')
    expect(groups[0]!.units).toEqual(['Room A', 'Room B'])
  })
})
