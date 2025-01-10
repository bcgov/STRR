export function formatBusinessDetails (bus: PlatBusiness): ApiPlatformBusinessDetails {
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

export function formatBusinessDetailsUI (bus: ApiPlatformBusinessDetails): PlatBusiness {
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

export function formatPlatformDetails (
  plat: { brands: StrrBrand[], listingSize: ListingSize | undefined }
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
