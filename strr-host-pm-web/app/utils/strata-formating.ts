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

// dashboard list table column formatters
export function getLastStatusChangeColumn (heading: ApplicationHeader) {
  if (heading.registrationStatus !== undefined) {
    return heading.registrationStartDate
  } else if (heading.decisionDate !== null) {
    return heading.decisionDate
  } else {
    return heading.applicationDateTime
  }
}

// value used to apply styling in table cell
export function getDaysToExpiryColumn (heading: ApplicationHeader): { label: string, value: number } {
  const t = useNuxtApp().$i18n.t
  const endDate = heading?.registrationEndDate

  // return '-' if no reg end date
  if (!endDate) {
    return { label: '-', value: NaN }
  }

  const daysTillExpiry = dayCountdown(endDate) // get days till expiry

  if (heading.status === RegistrationStatus.EXPIRED || daysTillExpiry < 0) {
    return { label: t('label.expired'), value: -1 }
  }

  if (daysTillExpiry === 0) {
    return { label: t('label.expiresToday'), value: daysTillExpiry }
  }

  return { label: t('label.dayCount', daysTillExpiry), value: daysTillExpiry }
}
