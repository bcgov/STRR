export const formStateToApi = (
  formState: CreateAccountFormStateI,
  hasSecondaryContact: boolean,
  propertyType: string,
  ownershipType: string
): CreateAccountFormAPII => {
  const formData = formDataForAPI

  const transformContactData = (isPrimaryContact: boolean) => {
    const dataContact: ContactAPII | undefined = isPrimaryContact
      ? formData.registration.primaryContact
      : formData.registration.secondaryContact

    if (!dataContact) {
      return
    }

    const { contactType } = formState.primaryContact

    const stateContact = isPrimaryContact ? formState.primaryContact : formState.secondaryContact

    dataContact.name = {
      firstName: stateContact.firstName,
      middleName: stateContact.middleName,
      lastName: stateContact.lastName
    }

    // Primary Contact Type Business
    if (isPrimaryContact && contactType === HostContactTypeE.BUSINESS) {
      dataContact.businessLegalName = formState.primaryContact.businessLegalName
      delete dataContact.dateOfBirth
      delete dataContact.socialInsuranceNumber
    }

    // Contact Type Individual
    if (contactType === HostContactTypeE.INDIVIDUAL) {
      dataContact.dateOfBirth = `${stateContact.birthYear}-${stateContact.birthMonth}-${stateContact.birthDay}`
      dataContact.socialInsuranceNumber = stateContact.socialInsuranceNumber
    }

    dataContact.contactType = isPrimaryContact ? formState.primaryContact.contactType : HostContactTypeE.INDIVIDUAL
    dataContact.businessNumber = stateContact.businessNumber
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
      formState.propertyDetails.listingDetails[0].url !== ''
        ? formState.propertyDetails.listingDetails
        : []
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
      numberOfRoomsForRent,
      ...(businessLicense ? { businessLicenseExpiryDate } : {}), // include exp date only if business license exists
      ...(isUnitOnPrincipalResidenceProperty ? { hostResidence } : {})
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

  const setPropertyManager = () => {
    const shouldHavePropertyManager =
      formState.isPropertyManagerRole ||
      (!formState.isPropertyManagerRole && formState.hasPropertyManager)
    if (shouldHavePropertyManager && formState.propertyManager) {
      formData.registration.propertyManager = {
        businessLegalName: formState.propertyManager.businessLegalName,
        businessNumber: formState.propertyManager.businessNumber,
        businessMailingAddress: {
          address: formState.propertyManager.businessMailingAddress.address ?? '',
          addressLineTwo: formState.propertyManager.businessMailingAddress.addressLineTwo,
          city: formState.propertyManager.businessMailingAddress.city ?? '',
          postalCode: formState.propertyManager.businessMailingAddress.postalCode ?? '',
          province: formState.propertyManager.businessMailingAddress.province ?? '',
          country: formState.propertyManager.businessMailingAddress.country ?? ''
        },
        contact: {
          firstName: formState.propertyManager.contact.firstName ?? '',
          middleName: formState.propertyManager.contact.middleName,
          lastName: formState.propertyManager.contact.lastName ?? '',
          preferredName: formState.propertyManager.contact.preferredName,
          phoneNumber: formState.propertyManager.contact.phoneNumber ?? '',
          extension: formState.propertyManager.contact.extension,
          faxNumber: formState.propertyManager.contact.faxNumber,
          emailAddress: formState.propertyManager.contact.emailAddress ?? ''
        },
        initiatedByPropertyManager: formState.isPropertyManagerRole
      }
    } else {
      delete formData.registration.propertyManager
    }
  }

  setListingDetails()
  setUnitAddress()
  setUnitDetails()
  setPrincipalResidence()
  setPropertyManager()
  return formData
}
