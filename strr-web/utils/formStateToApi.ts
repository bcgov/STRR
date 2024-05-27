export const formStateToApi = (
  formState: CreateAccountFormStateI,
  firstName: string,
  lastName: string,
  fullName: string,
  selectedAccountMailingAddress: SelectedAccountMailingAPII[] | undefined
): CreateAccountFormAPII => {
  const formData = formDataForAPI

  const transformContactData = (primary: boolean) => {
    const dataContact: ContactAPII = primary
      ? formData.registration.primaryContact
      : formData.registration.secondaryContact
    const stateContact = primary
      ? formState.primaryContact
      : formState.secondaryContact
    dataContact.name = {
      firstName,
      lastName
    }
    dataContact.dateOfBirth = {
      date: ''
    }
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
  formData.registration.secondaryContact = transformContactData(false)
  formData.registration.listingDetails =
    formState.propertyDetails.listingDetails.map((url: string) => ({ url }))
  formData.registration.unitAddress = {
    address: formState.propertyDetails.address ?? '',
    addressLineTwo: formState.propertyDetails.addressLineTwo,
    city: formState.propertyDetails.city ?? '',
    postalCode: formState.propertyDetails.postalCode ?? '',
    province: formState.propertyDetails.province ?? '',
    country: formState.propertyDetails.country ?? ''
  }
  formData.registration.unitDetails = {
    parcelIdentifier: formState.propertyDetails.parcelIdentifier,
    propertyType: formState.propertyDetails.propertyType ?? '',
    ownershipType: formState.propertyDetails.ownershipType ?? '',
    businessLicense: formState.propertyDetails.businessLicense
  }
  if (selectedAccountMailingAddress && selectedAccountMailingAddress.length) {
    formData.selectedAccount.mailingAddress = {
      ...selectedAccountMailingAddress[0]
    }
  }
  formData.selectedAccount.name = fullName

  return formData
}