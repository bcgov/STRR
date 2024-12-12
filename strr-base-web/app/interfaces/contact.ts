export interface Contact {
  firstName?: string
  middleName?: string
  lastName: string
  preferredName?: string
  phone: ConnectPhone
  faxNumber?: string
  emailAddress: string
}

export interface StrrContact extends Contact {
  position: string
}
