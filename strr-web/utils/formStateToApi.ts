export const formStateToApi = (
  formState: CreateAccountFormStateI,
  firstName: string,
  lastName: string,
  hasSecondaryContact: boolean,
  propertyType: string,
  ownershipType: string
): CreateAccountFormAPII => {
  const formData = formDataForAPI

  const transformContactData = (primary: boolean) => {
    const dataContact: ContactAPII | undefined = primary
      ? formData.registration.primaryContact
      : formData.registration.secondaryContact
    if (!dataContact) { return }
    const stateContact = primary
      ? formState.primaryContact
      : formState.secondaryContact
    dataContact.name = {
      firstName:
        primary
          ? firstName.toString()
          : formState.secondaryContact?.firstName
            ? formState.secondaryContact?.firstName
            : '-',
      lastName:
        primary
          ? lastName.toString()
          : formState.secondaryContact?.lastName
            ? formState.secondaryContact?.lastName
            : '-'
    }
    dataContact.socialInsuranceNumber = stateContact.socialInsuranceNumber ?? ''
    dataContact.businessNumber = stateContact.businessNumber ?? ''
    dataContact.dateOfBirth = `${stateContact.birthYear}-${stateContact.birthMonth}-${stateContact.birthDay}`
    dataContact.details = {
      preferredName: stateContact.preferredName,
      phoneNumber: stateContact.phoneNumber ?? '',
      extension: stateContact.extension,
      faxNumber: stateContact.faxNumber,
      emailAddress: stateContact.emailAddress ?? ''
    }
    dataContact.mailingAddress = {
      address: stateContact.address ?? '',
      addressLineTwo: stateContact.addressLineTwo,
      city: stateContact.city ?? '',
      postalCode: stateContact.postalCode ?? '',
      province: stateContact.province ?? '',
      country: stateContact.country ?? ''
    }

    return dataContact
  }

  formData.registration.primaryContact = transformContactData(true)
  if (hasSecondaryContact) {
    formData.registration.secondaryContact = transformContactData(false)
  } else {
    delete formData.registration.secondaryContact
  }
  if (formState.propertyDetails.listingDetails[0].url !== '') {
    formData.registration.listingDetails = formState.propertyDetails.listingDetails
  } else {
    formData.registration.listingDetails = []
  }
  formData.registration.unitAddress = {
    address: formState.propertyDetails.address ?? '',
    addressLineTwo: formState.propertyDetails.addressLineTwo,
    city: formState.propertyDetails.city ?? '',
    postalCode: formState.propertyDetails.postalCode ?? '',
    province: formState.propertyDetails.province ?? '',
    country: formState.propertyDetails.country ?? '',
    nickname: formState.propertyDetails.nickname ?? ''
  }
  formData.registration.unitDetails = {
    parcelIdentifier: formState.propertyDetails.parcelIdentifier,
    propertyType,
    ownershipType,
    businessLicense: formState.propertyDetails.businessLicense
  }
  if (formState.principal.isPrincipal) {
    formData.registration.principalResidence = {
      isPrincipalResidence: formState.principal.isPrincipal ?? false,
      agreedToRentalAct: formState.principal.declaration,
      agreedToSubmit: formState.principal.agreeToSubmit
    }
    delete formState.principal.reason
    delete formState.principal.otherReason
  } else {
    formData.registration.principalResidence = {
      isPrincipalResidence: formState.principal.isPrincipal ?? false,
      agreedToRentalAct: formState.principal.declaration,
      nonPrincipalOption: formState.principal.reason ?? 'n/a',
      specifiedServiceProvider: formState.principal.otherReason ?? 'n/a',
      agreedToSubmit: formState.principal.agreeToSubmit
    }
  }

  return formData
}
