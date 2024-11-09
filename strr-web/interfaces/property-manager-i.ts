export interface PropertyManagerContactI {
    firstName: string
    middleName: string | undefined
    lastName: string
    preferredName: string | undefined
    phoneNumber: string
    extension: string | undefined
    faxNumber: string | undefined
    emailAddress: string
}

export interface PropertyManagerBusinessAddressI {
    address: string
    country: string
    addressLineTwo: string | undefined
    city: string
    province: string
    postalCode: string
  }

export interface PropertyManagerI {
    businessLegalName: string | undefined
    businessNumber: string | undefined
    businessMailingAddress: PropertyManagerBusinessAddressI
    contact: PropertyManagerContactI
    initiatedByPropertyManager: boolean | undefined
}
