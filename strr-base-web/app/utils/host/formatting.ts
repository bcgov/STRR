export function formatOwnerHostAPI (owner: HostOwner): ApiHostContactPerson | ApiHostContactBusiness {
  return {
    ...formatParty(owner),
    contactType: owner.ownerType,
    mailingAddress: formatAddress(owner.mailingAddress),
    ...(owner.dateOfBirth ? { dateOfBirth: owner.dateOfBirth } : {}),
    ...(owner.taxNumber ? { socialInsuranceNumber: owner.taxNumber } : {}),
    ...(owner.businessLegalName ? { businessLegalName: owner.businessLegalName } : {}),
    ...(owner.businessNumber ? { businessNumber: owner.businessNumber } : {})
  }
}

export function formatOwnerHostUI (
  owner: ApiHostContactPerson | ApiHostContactBusiness,
  isCompParty: boolean,
  isCoHost?: boolean
): HostOwner {
  return {
    ...formatPartyUI(owner),
    ownerType: owner.contactType,
    dateOfBirth: owner.dateOfBirth || '',
    taxNumber: owner.socialInsuranceNumber || '',
    mailingAddress: formatAddressUI(owner.mailingAddress),
    businessLegalName: owner.businessLegalName || '',
    businessNumber: owner.businessNumber || '',
    role: isCoHost ? OwnerRole.CO_HOST : OwnerRole.HOST,
    isCompParty
  }
}

export function formatOwnerPropertyManagerAPI (owner: HostOwner): ApiPropertyManager {
  return {
    initiatedByPropertyManager: owner.isCompParty,
    propertyManagerType: owner.ownerType,
    ...(owner.ownerType === OwnerType.INDIVIDUAL
      ? {
          contact: {
            ...formatParty(owner),
            mailingAddress: formatAddress(owner.mailingAddress)
          }
        }
      : {
          business: {
            legalName: owner.businessLegalName,
            ...(owner.businessNumber ? { businessNumber: owner.businessNumber } : {}),
            mailingAddress: formatAddress(owner.mailingAddress),
            primaryContact: { ...formatParty(owner) }
          }
        }
    )
  }
}

export function formatOwnerPropertyManagerUI (owner: ApiPropertyManager): HostOwner {
  return {
    ownerType: owner.propertyManagerType,
    ...formatPartyUI((owner.contact || owner.business?.primaryContact) as ApiParty),
    mailingAddress: formatAddressUI((owner.contact?.mailingAddress || owner.business?.mailingAddress) as ApiAddress),
    businessLegalName: owner.business?.legalName || '',
    businessNumber: owner.business?.businessNumber || '',
    dateOfBirth: '',
    taxNumber: '',
    role: OwnerRole.PROPERTY_MANAGER,
    isCompParty: owner.initiatedByPropertyManager
  }
}

export function formatHostUnitDetailsAPI (
  unitDetails: UiUnitDetails,
  blInfo: UiBlInfo,
  prReqs: PrRequirements
): ApiUnitDetails {
  return {
    propertyType: unitDetails.propertyType,
    ownershipType: unitDetails.ownershipType,
    numberOfRoomsForRent: unitDetails.numberOfRoomsForRent,
    isUnitOnPrincipalResidenceProperty: unitDetails.rentalUnitSetupType === undefined
      ? undefined
      : unitDetails.rentalUnitSetupType !== RentalUnitSetupType.UNIT_NOT_ON_PR_PROPERTY,
    hostResidence: unitDetails.rentalUnitSetupType === undefined
      ? undefined
      : unitDetails.rentalUnitSetupType === RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE
        ? ResidenceType.SAME_UNIT
        : ResidenceType.ANOTHER_UNIT,
    rentalUnitSpaceType: unitDetails.typeOfSpace,
    ...(unitDetails.parcelIdentifier ? { parcelIdentifier: unitDetails.parcelIdentifier } : {}),
    ...(blInfo.businessLicense ? { businessLicense: blInfo.businessLicense } : {}),
    ...(blInfo.businessLicenseExpiryDate ? { businessLicenseExpiryDate: blInfo.businessLicenseExpiryDate } : {}),
    ...(prReqs.isPropertyPrExempt && prReqs.prExemptionReason ? { prExemptReason: prReqs.prExemptionReason } : {})
  }
}

export function formatHostUnitDetailsUI (unitDetails: ApiUnitDetails): UiUnitDetails {
  const rentalSetupType = unitDetails.isUnitOnPrincipalResidenceProperty === undefined
    ? undefined
    : unitDetails.isUnitOnPrincipalResidenceProperty
      ? unitDetails.hostResidence === ResidenceType.SAME_UNIT
        ? RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE
        : RentalUnitSetupType.UNIT_ON_PR_PROPERTY
      : RentalUnitSetupType.UNIT_NOT_ON_PR_PROPERTY
  return {
    propertyType: unitDetails.propertyType,
    ownershipType: unitDetails.ownershipType,
    numberOfRoomsForRent: unitDetails.numberOfRoomsForRent,
    rentalUnitSetupType: rentalSetupType,
    typeOfSpace: unitDetails.rentalUnitSpaceType,
    ...(unitDetails.parcelIdentifier ? { parcelIdentifier: unitDetails.parcelIdentifier } : {})
  }
}

export function formatHostUnitDetailsBlInfoUI (unitDetails: ApiUnitDetails): UiBlInfo {
  return {
    businessLicense: unitDetails.businessLicense || '',
    businessLicenseExpiryDate: unitDetails.businessLicenseExpiryDate || ''
  }
}

export function formatHostUnitAddressApi (unitAddress: HostPropertyAddress): ApiUnitAddress {
  const baseAddress = formatAddress(unitAddress)
  delete baseAddress.address // including this passes API validation, but causes a failure in the registration creation
  return {
    ...baseAddress,
    nickname: unitAddress.nickname || '',
    streetName: unitAddress.streetName || '',
    streetNumber: unitAddress.streetNumber || '',
    unitNumber: unitAddress.unitNumber || ''
  }
}

export function formatHostUnitAddressUI (unitAddress: ApiUnitAddress): HostPropertyAddress {
  const baseAddress = formatAddressUI(unitAddress)
  const street = baseAddress.street
    ? baseAddress.street
    : `${unitAddress.unitNumber ? unitAddress.unitNumber + '-' : ''}` +
      `${unitAddress.streetNumber || ''} ${unitAddress.streetName}`.trim()
  return {
    ...baseAddress,
    nickname: unitAddress.nickname || '',
    streetName: unitAddress.streetName || '',
    streetNumber: unitAddress.streetNumber || '',
    unitNumber: unitAddress.unitNumber || '',
    street
  }
}
