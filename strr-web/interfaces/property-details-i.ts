export interface PropertyDetailsI {
    primaryResidence: string | undefined
    whichPlatform: string | undefined
    parcelIdentifier: string | undefined
    businessLicense: string | undefined
    businessLicenseExpiryDate: string | undefined
    propertyType: string | undefined
    ownershipType: string | undefined
    nickname: string | undefined
    country: string | undefined
    address: string | undefined
    addressLineTwo: string | undefined
    city: string | undefined
    province: string | undefined
    postalCode: string | undefined
    listingDetails: { url: string }[]
    rentalUnitSpaceType: string
    isUnitOnPrincipalResidenceProperty: boolean | undefined
    hostResidence: string | undefined
    numberOfRoomsForRent: number
  }
