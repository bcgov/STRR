export interface PropertyManagerContactI {
  firstName: string
  middleName?: string
  lastName: string
  preferredName?: string
  phoneNumber: string
  extension?: string
  faxNumber?: string
  emailAddress: string
}

export interface PropertyManagerI {
  businessLegalName?: string
  craBusinessNumber?: string
  businessMailingAddress: MailingAddressAPII
  contact: PropertyManagerContactI
}
