export function formatPhoneNumber (phone: ConnectPhone) {
  return {
    phoneNumber: `${phone.countryCode ?? ''}${phone.number}`,
    extension: phone.extension ?? ''
  }
}

export function formatAddress (add: ConnectAddress): ApiAddress {
  return {
    country: add.country,
    address: add.street,
    addressLineTwo: add.streetAdditional,
    city: add.city,
    province: add.region,
    postalCode: add.postalCode
  }
}

export function formatParty (party: Contact): ApiParty {
  return {
    firstName: party.firstName,
    middleName: party.middleName ?? '',
    lastName: party.lastName,
    ...formatPhoneNumber(party.phone),
    faxNumber: party.faxNumber ?? '',
    emailAddress: party.emailAddress
  }
}

export function formatRepresentative (rep: PlatformContact): ApiRep {
  return {
    ...formatParty(rep),
    jobTitle: rep.position
  }
}

export function formatBusinessDetails (bus: PlatBusiness): ApiBusinessDetails {
  return {
    legalName: bus.legalName,
    homeJurisdiction: bus.homeJurisdiction,
    businessNumber: bus.businessNumber,
    consumerProtectionBCLicenceNumber: bus.cpbcLicenceNumber,
    noticeOfNonComplianceEmail: bus.nonComplianceEmail,
    noticeOfNonComplianceOptionalEmail: bus.nonComplianceEmailOptional,
    takeDownRequestEmail: bus.takeDownEmail,
    takeDownRequestOptionalEmail: bus.takeDownEmailOptional,
    mailingAddress: formatAddress(bus.mailingAddress),
    registeredOfficeOrAttorneyForServiceDetails: {
      attorneyName: bus.regOfficeOrAtt.attorneyName,
      mailingAddress: formatAddress(bus.regOfficeOrAtt.mailingAddress)
    }
  }
}

export function formatPlatformDetails (
  plat: { brands: PlatBrand[], listingSize: ListingSize | undefined }
): ApiPlatformDetails {
  return {
    brands: plat.brands.map(brand => ({
      name: brand.name,
      website: brand.website
    })),
    listingSize: plat.listingSize! // should never be undefined after being validated
  }
}
