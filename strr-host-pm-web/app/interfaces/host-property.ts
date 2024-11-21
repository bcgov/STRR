export interface HostPropertyAddress extends ConnectAddress {
  nickname: string
  unitNumber: string
}

export interface HostProperty extends ApiUnitDetails {
  address: HostPropertyAddress
  listingDetails: { url: string }[]
}
