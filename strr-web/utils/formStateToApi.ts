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

    if (!dataContact) {
      return
    }

    const stateContact = primary ? formState.primaryContact : formState.secondaryContact

    dataContact.name = {
      firstName: primary ? firstName.toString() : formState.secondaryContact?.firstName ?? '-',
      lastName: primary ? lastName.toString() : formState.secondaryContact?.lastName ?? '-'
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

  const setListingDetails = () => {
    formData.registration.listingDetails =
      formState.propertyDetails.listingDetails[0].url !== '' ? formState.propertyDetails.listingDetails : []
  }

  const setUnitAddress = () => {
    formData.registration.unitAddress = {
      address: formState.propertyDetails.address ?? '',
      addressLineTwo: formState.propertyDetails.addressLineTwo,
      city: formState.propertyDetails.city ?? '',
      postalCode: formState.propertyDetails.postalCode ?? '',
      province: formState.propertyDetails.province ?? '',
      country: formState.propertyDetails.country ?? '',
      nickname: formState.propertyDetails.nickname ?? ''
    }
  }

  const setUnitDetails = () => {
    const {
      parcelIdentifier,
      businessLicense,
      businessLicenseExpiryDate,
      rentalUnitSpaceType,
      isUnitOnPrincipalResidenceProperty,
      hostResidence,
      numberOfRoomsForRent
    } = formState.propertyDetails

    formData.registration.unitDetails = {
      parcelIdentifier,
      propertyType,
      ownershipType,
      businessLicense,
      rentalUnitSpaceType,
      isUnitOnPrincipalResidenceProperty,
      hostResidence,
      numberOfRoomsForRent,
      ...(businessLicense ? { businessLicenseExpiryDate } : {}) // include exp date only if business license exists
    }
  }

  const setPrincipalResidence = () => {
    const { isPrincipal, declaration, agreeToSubmit, reason, otherReason } = formState.principal

    formData.registration.principalResidence = {
      isPrincipalResidence: isPrincipal ?? false,
      agreedToRentalAct: declaration,
      agreedToSubmit: agreeToSubmit,
      ...(isPrincipal
        ? {}
        : {
            nonPrincipalOption: reason ?? 'n/a',
            specifiedServiceProvider: otherReason ?? 'n/a'
          })
    }
  }

  formData.registration.primaryContact = transformContactData(true)

  if (hasSecondaryContact) {
    formData.registration.secondaryContact = transformContactData(false)
  } else {
    delete formData.registration.secondaryContact
  }

  setListingDetails()
  setUnitAddress()
  setUnitDetails()
  setPrincipalResidence()

  return formData
}
