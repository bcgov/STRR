export interface StrataUnitListings {
  primary: string
  additional: string[]
}

export interface StrataUnitListingGroup {
  id: string
  label: string
  addressLines: string[]
  units: string[]
}

export interface StrataDetails {
  brand: StrrBrand,
  buildings: ConnectAddress[]
  location: ConnectAddress
  numberOfUnits: number | undefined
  category: StrataHotelCategory | undefined
  unitListings: StrataUnitListings
}
