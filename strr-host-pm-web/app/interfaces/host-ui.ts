// export interface HostPropertyAddress extends ConnectAddress {
//   nickname: string
//   unitNumber: string
// }

export interface UiUnitDetails {
  parcelIdentifier: string
  businessLicense: string
  businessLicenseExpiryDate: string
  propertyType: PropertyType | undefined
  ownershipType: OwnwershipType | undefined
  numberOfRoomsForRent: number | undefined
  rentalUnitSetupType: RentalUnitSetupType | undefined
}

export interface UiHostProperty extends UiUnitDetails {
  address: HostPropertyAddress
  listingDetails: { url: string }[]
}
