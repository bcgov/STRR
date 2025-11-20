import type { StrataDetails } from '~/interfaces/strata-details'

/**
 * Ensures the additional unit listings array matches the number of buildings.
 * Truncates if too long, pads with empty strings if too short.
 * This keeps the unit listings in sync when buildings are added/removed.
 */
const normalizeAdditionalUnitListings = (units: string[] | undefined, targetLength: number) => {
  const normalized = [...(units || [])]

  if (normalized.length > targetLength) {
    normalized.length = targetLength
    return normalized
  }

  while (normalized.length < targetLength) {
    normalized.push('')
  }

  return normalized
}

export function formatBusinessDetails (bus: StrrBusiness): ApiBusinessDetails {
  return {
    legalName: bus.legalName,
    homeJurisdiction: bus.homeJurisdiction,
    businessNumber: bus.businessNumber,
    mailingAddress: formatAddress(bus.mailingAddress),
    registeredOfficeOrAttorneyForServiceDetails: {
      attorneyName: bus.regOfficeOrAtt.attorneyName,
      mailingAddress: formatAddress(bus.regOfficeOrAtt.mailingAddress)
    }
  }
}

export function formatBusinessDetailsUI (bus: ApiBusinessDetails): StrrBusiness {
  return {
    legalName: bus.legalName,
    homeJurisdiction: bus.homeJurisdiction,
    businessNumber: bus.businessNumber,
    mailingAddress: formatAddressUI(bus.mailingAddress),
    hasRegOffAtt: !!bus.registeredOfficeOrAttorneyForServiceDetails.attorneyName ||
      !!bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress.address ||
      !!bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress.addressLineTwo ||
      !!bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress.city ||
      !!bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress.country ||
      !!bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress.postalCode ||
      !!bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress.province ||
      !!bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress.locationDescription,
    regOfficeOrAtt: {
      sameAsMailAddress: isSameAddress(
        bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress, bus.mailingAddress),
      attorneyName: bus.registeredOfficeOrAttorneyForServiceDetails.attorneyName,
      mailingAddress: formatAddressUI(bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress)
    }
  }
}

export function formatStrataDetails (details: StrataDetails): ApiStrataDetails {
  return {
    brand: details.brand,
    buildings: details.buildings.map(building => (formatAddress(building))),
    location: formatAddress(details.location),
    numberOfUnits: details.numberOfUnits as number,
    category: details.category,
    unitListings: {
      primary: details.unitListings.primary,
      additional: normalizeAdditionalUnitListings(details.unitListings.additional, details.buildings.length)
    }
  }
}

export function formatStrataDetailsUI (details: ApiStrataDetails): StrataDetails {
  return {
    brand: details.brand,
    buildings: details.buildings.map(building => (formatAddressUI(building))),
    location: formatAddressUI(details.location),
    numberOfUnits: details.numberOfUnits as number,
    category: details.category,
    unitListings: {
      primary: details.unitListings?.primary || '',
      additional: normalizeAdditionalUnitListings(details.unitListings?.additional, details.buildings.length)
    }
  }
}

/**
 * Splits a multi line textarea input into individual unit values.
 * Trims each line and filters out empties so the review modal only shows real entries.
 */
const splitUnitLines = (value?: string) => (
  value?.split(/\r?\n/)
    .map(unit => unit.trim())
    .filter(unit => unit.length) || []
)

/**
 * Formats a ConnectAddress into the one-line display used in the unit list modal.
 */
export const formatStrataUnitAddressLines = (address?: ConnectAddress): string[] => {
  if (!address) { return [] }
  const lines: string[] = []
  const streetLine = [address.street, address.streetAdditional].filter(Boolean).join(' ').trim()
  if (streetLine) {
    lines.push(streetLine)
  }
  const cityRegion = [address.city, address.region].filter(Boolean).join(', ').trim()
  const postal = address.postalCode?.toUpperCase()
  const locationLine = [cityRegion, postal].filter(Boolean).join('  ').trim()
  if (locationLine) {
    lines.push(locationLine)
  }
  return lines
}

/**
 * Builds the data structure consumed by the rental unit modal and review link.
 * Groups primary + additional building units.
 */
export const buildStrataUnitListingGroups = (
  details: StrataDetails,
  labels: {
    primaryLabel: string
    buildingLabel: (index: number) => string
  }
): StrataUnitListingGroup[] => {
  const groups: StrataUnitListingGroup[] = []

  const primaryUnits = splitUnitLines(details.unitListings.primary)
  if (primaryUnits.length) {
    groups.push({
      id: 'primary',
      label: labels.primaryLabel,
      addressLines: formatStrataUnitAddressLines(details.location),
      units: primaryUnits
    })
  }

  details.buildings.forEach((building, index) => {
    const additionalUnits = splitUnitLines(details.unitListings.additional[index])
    if (additionalUnits.length) {
      groups.push({
        id: `building-${index}`,
        label: labels.buildingLabel(index),
        addressLines: formatStrataUnitAddressLines(building),
        units: additionalUnits
      })
    }
  })

  return groups
}
