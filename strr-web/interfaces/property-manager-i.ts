export interface PropertyManagerContactI {
    firstName: string | undefined
    middleName: string | undefined
    lastName: string | undefined
    preferredName: string | undefined
    phoneNumber: string | undefined
    extension: string | undefined
    faxNumber: string | undefined
    emailAddress: string | undefined
}

export interface PropertyManagerBusinessAddressI {
    address: string | undefined
    country: string | undefined
    addressLineTwo: string | undefined
    city: string | undefined
    province: string | undefined
    postalCode: string | undefined
  }

export interface PropertyManagerI {
    businessLegalName: string | undefined
    businessNumber: string | undefined
    businessMailingAddress: PropertyManagerBusinessAddressI
    contact: PropertyManagerContactI
}
