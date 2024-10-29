export interface Contact {
  firstName: string
  middleName?: string
  lastName: string
  phone: ConnectPhone
  faxNumber?: string
  emailAddress: string
}

export interface PlatformContact extends Contact {
  position: string
}

export interface HostContactInformation {
  fullName: string
  preferredName: string
  phone: ConnectPhone
  faxNumber: string
  emailAddress: string
  address: ConnectAddress
  dateOfBirth: string
  businessNumber: string
  socialInsuranceNumber: string
}
