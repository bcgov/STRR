// export interface HostPropertyAddress extends ConnectAddress {
//   nickname: string
//   unitNumber: string
// }

export interface UiBlInfo {
  businessLicense: string
  businessLicenseExpiryDate: string
}

export interface UiUnitDetails {
  parcelIdentifier: string
  propertyType: PropertyType | undefined
  ownershipType: OwnwershipType | undefined
  numberOfRoomsForRent: number | undefined
  rentalUnitSetupType: RentalUnitSetupType | undefined
}

export interface UiHostProperty extends UiUnitDetails {
  address: HostPropertyAddress
  listingDetails: { url: string }[]
}
