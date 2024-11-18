import type { StrataDetails } from '~/interfaces/strata-details'

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
    hasRegOffAtt: !!bus.registeredOfficeOrAttorneyForServiceDetails.mailingAddress,
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
    numberOfUnits: details.numberOfUnits as number
  }
}

export function formatStrataDetailsUI (details: ApiStrataDetails): StrataDetails {
  return {
    brand: details.brand,
    buildings: details.buildings.map(building => (formatAddressUI(building))),
    location: formatAddressUI(details.location),
    numberOfUnits: details.numberOfUnits as number
  }
}
