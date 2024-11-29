export interface HostOwner extends Contact {
  ownerType: OwnerType
  preferredName: string
  mailingAddress: ConnectAddress
  businessLegalName: string
  businessNumber: string
  dateOfBirth: string
  role: OwnerRole | undefined,
  isCompParty: boolean
  taxNumber: string
}
