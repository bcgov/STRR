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
  const emptyAddress: ConnectAddress = {
    street: '',
    streetAdditional: '',
    city: '',
    region: '',
    country: '',
    postalCode: '',
    locationDescription: ''
  }

  return {
    legalName: bus.legalName,
    homeJurisdiction: bus.homeJurisdiction,
    businessNumber: bus.businessNumber,
    mailingAddress: formatAddress(bus.mailingAddress),
    registeredOfficeOrAttorneyForServiceDetails: {
      attorneyName: '',
      mailingAddress: formatAddress(emptyAddress)
    }
  }
}

export function formatBusinessDetailsUI (bus: ApiBusinessDetails): StrrBusiness {
  const emptyApiAddress: ApiAddress = {
    address: '',
    addressLineTwo: '',
    city: '',
    province: '',
    country: '',
    postalCode: '',
    locationDescription: ''
  }
  const attorneyDetails = bus.registeredOfficeOrAttorneyForServiceDetails || {
    attorneyName: '',
    mailingAddress: emptyApiAddress
  }
  const attorneyAddress = attorneyDetails.mailingAddress || emptyApiAddress

  return {
    legalName: bus.legalName,
    homeJurisdiction: bus.homeJurisdiction,
    businessNumber: bus.businessNumber,
    mailingAddress: formatAddressUI(bus.mailingAddress),
    hasRegOffAtt: !!attorneyDetails.attorneyName ||
      !!attorneyAddress.address ||
      !!attorneyAddress.addressLineTwo ||
      !!attorneyAddress.city ||
      !!attorneyAddress.country ||
      !!attorneyAddress.postalCode ||
      !!attorneyAddress.province ||
      !!attorneyAddress.locationDescription,
    regOfficeOrAtt: {
      sameAsMailAddress: isSameAddress(
        attorneyAddress, bus.mailingAddress),
      attorneyName: attorneyDetails.attorneyName,
      mailingAddress: formatAddressUI(attorneyAddress)
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
 * Format the address for the unit list modal.
 * Reuse the base layer formatter so address display stays consistent everywhere.
 * Removes leading commas that appear when city is missing (e.g., ", BC").
 */
export const formatStrataUnitAddressLines = (address?: ConnectAddress): string[] => {
  if (!address) { return [] }
  return getAddressDisplayParts(address, false, true, true)
    .map(line => line.replace(/^,\s*/, '').trim())
    .filter(line => line.length)
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
