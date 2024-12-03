export function formatOwnerHostUI (
  owner: ApiHostContactPerson,
  isCompParty: boolean,
  isCoHost?: boolean
): HostOwner {
  return {
    ownerType: owner.contactType,
    firstName: owner.name.firstName || '',
    middleName: owner.name.middleName || '',
    lastName: owner.name.lastName || '',
    preferredName: owner.details.preferredName || '',
    emailAddress: owner.details.emailAddress || '',
    phone: formatPhoneNumberUI(owner.details),
    faxNumber: owner.details.faxNumber || '',
    dateOfBirth: owner.dateOfBirth || '',
    taxNumber: owner.socialInsuranceNumber || '',
    mailingAddress: formatAddressUI(owner.mailingAddress),
    businessLegalName: owner.businessLegalName || '',
    businessNumber: owner.businessNumber || '',
    role: isCoHost ? OwnerRole.CO_HOST : OwnerRole.HOST,
    isCompParty
  }
}

export function formatOwnerPropertyManagerUI (owner: ApiPropertyManager): HostOwner {
  return {
    ownerType: OwnerType.BUSINESS,
    firstName: owner.contact.firstName || '',
    middleName: owner.contact.middleName || '',
    lastName: owner.contact.lastName || '',
    preferredName: owner.contact.preferredName || '',
    emailAddress: owner.contact.emailAddress || '',
    phone: formatPhoneNumberUI(owner.contact),
    faxNumber: owner.contact.faxNumber || '',
    mailingAddress: formatAddressUI(owner.businessMailingAddress),
    businessLegalName: owner.businessLegalName || '',
    businessNumber: owner.businessNumber || '',
    dateOfBirth: '',
    taxNumber: '',
    role: OwnerRole.PROPERTY_MANAGER,
    isCompParty: owner.initiatedByPropertyManager
  }
}

export function formatHostUnitDetailsUI (unitDetails: ApiUnitDetails): UiUnitDetails {
  // TODO: review rentalSetupType mapping
  const rentalSetupType = unitDetails.isUnitOnPrincipalResidenceProperty
    ? unitDetails.hostResidence === ResidenceType.SAME_UNIT
      ? RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE
      : RentalUnitSetupType.UNIT_ON_PR_PROPERTY
    : RentalUnitSetupType.UNIT_NOT_ON_PR_PROPERTY
  return {
    parcelIdentifier: unitDetails.parcelIdentifier || '',
    propertyType: unitDetails.propertyType,
    ownershipType: unitDetails.ownershipType,
    numberOfRoomsForRent: unitDetails.numberOfRoomsForRent,
    rentalUnitSetupType: rentalSetupType,
    typeOfSpace: unitDetails.rentalUnitSpaceType
  }
}

export function formatHostUnitAddressUI (unitAddress: ApiUnitAddress): HostPropertyAddress {
  if (!unitAddress.address) {
    unitAddress.address = unitAddress.unitNumber
      ? `${unitAddress.unitNumber}-${unitAddress.streetNumber} ${unitAddress.streetName}`
      : `${unitAddress.streetNumber} ${unitAddress.streetName}`
  }
  const address = formatAddressUI(unitAddress)
  return {
    ...address,
    nickname: unitAddress.nickname || '',
    streetName: unitAddress.streetName || '',
    streetNumber: unitAddress.streetNumber || '',
    unitNumber: unitAddress.unitNumber || ''
  }
}
