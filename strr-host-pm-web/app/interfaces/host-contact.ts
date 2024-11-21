export interface HostContact extends Contact {
  contactType: ContactType
  preferredName: string
  mailingAddress: ConnectAddress
  businessLegalName: string
  businessNumber: string
  dateOfBirth: string
}
