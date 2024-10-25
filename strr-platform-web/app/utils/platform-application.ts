export function formatPhoneNumber (party: Contact): ApiPhone {
  return {
    phoneNumber: party.phone.number,
    phoneCountryCode: party.phone.countryCode ?? '',
    extension: party.phone.extension ?? ''
  }
}

export function formatPhoneNumberUI (party: ApiParty): ConnectPhone {
  return {
    countryCode: party.phoneCountryCode,
    number: party.phoneNumber,
    extension: party.extension ?? ''
  }
}

export function formatAddress (add: ConnectAddress): ApiAddress {
  return {
    country: add.country,
    address: add.street,
    addressLineTwo: add.streetAdditional,
    city: add.city,
    province: add.region,
    postalCode: add.postalCode,
    locationDescription: add.locationDescription
  }
}

export function formatAddressUI (add: ApiAddress): ConnectAddress {
  return {
    country: add.country,
    city: add.city,
    postalCode: add.postalCode,
    street: add.address,
    streetAdditional: add.addressLineTwo,
    region: add.province,
    locationDescription: add.locationDescription
  }
}

export function formatParty (party: Contact): ApiParty {
  return {
    firstName: party.firstName,
    middleName: party.middleName ?? '',
    lastName: party.lastName,
    ...formatPhoneNumber(party),
    faxNumber: party.faxNumber ?? '',
    emailAddress: party.emailAddress
  }
}

export function formatPartyUI (party: ApiParty): Contact {
  return {
    firstName: party.firstName,
    middleName: party.middleName ?? '',
    lastName: party.lastName,
    faxNumber: party.faxNumber ?? '',
    emailAddress: party.emailAddress,
    phone: formatPhoneNumberUI(party)
  }
}

export function formatRepresentative (rep: PlatformContact): ApiRep {
  return {
    ...formatParty(rep),
    jobTitle: rep.position
  }
}

export function formatRepresentativeUI (rep: ApiRep): PlatformContact {
  return {
    ...formatPartyUI(rep),
    position: rep.jobTitle
  }
}

export function formatBusinessDetails (bus: PlatBusiness): ApiBusinessDetails {
  return {
    legalName: bus.legalName,
    homeJurisdiction: bus.homeJurisdiction,
    businessNumber: bus.businessNumber,
    consumerProtectionBCLicenceNumber: bus.cpbcLicenceNumber,
    noticeOfNonComplianceEmail: bus.nonComplianceEmail,
    takeDownRequestEmail: bus.takeDownEmail,
    mailingAddress: formatAddress(bus.mailingAddress),
    registeredOfficeOrAttorneyForServiceDetails: {
      attorneyName: bus.regOfficeOrAtt.attorneyName,
      mailingAddress: formatAddress(bus.regOfficeOrAtt.mailingAddress)
    },
    // add optional fields only if defined
    ...(bus.nonComplianceEmailOptional && { noticeOfNonComplianceOptionalEmail: bus.nonComplianceEmailOptional }),
    ...(bus.takeDownEmailOptional && { takeDownRequestOptionalEmail: bus.takeDownEmailOptional })
  }
}

function isSameAddress (addr1: object, addr2: object) {
  return Object.values(addr1).toString() === Object.values(addr2).toString()
}

export function formatBusinessDetailsUI (bus: ApiBusinessDetails): PlatBusiness {
  return {
    legalName: bus.legalName,
    homeJurisdiction: bus.homeJurisdiction,
    businessNumber: bus.businessNumber,
    hasCpbc: !!bus.consumerProtectionBCLicenceNumber,
    cpbcLicenceNumber: bus.consumerProtectionBCLicenceNumber,
    nonComplianceEmail: bus.noticeOfNonComplianceEmail,
    nonComplianceEmailOptional: bus.noticeOfNonComplianceOptionalEmail ?? '',
    takeDownEmail: bus.takeDownRequestEmail,
    takeDownEmailOptional: bus.takeDownRequestOptionalEmail ?? '',
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

export function formatPlatformDetails (
  plat: { brands: PlatBrand[], listingSize: ListingSize | undefined }
): ApiPlatformDetails {
  // TODO: we can remove this I think as the mapping is the same?
  return {
    brands: plat.brands.map(brand => ({
      name: brand.name,
      website: brand.website
    })),
    listingSize: plat.listingSize! // should never be undefined after being validated
  }
}
