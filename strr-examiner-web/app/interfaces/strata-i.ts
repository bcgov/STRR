export interface ApiStrataUnitListings {
  primary?: string
  additional?: string[]
}

export interface ApiStrataDetails {
  brand: StrrBrand
  buildings: ApiAddress[]
  location: ApiAddress
  numberOfUnits: number
  category: StrataHotelCategory | undefined
  documents: ApiDocument[]
  unitListings?: ApiStrataUnitListings
}

export interface ApiBaseStrataRegistration extends ApiBaseRegistration {
  strataHotelRepresentatives: ApiRep[]
  strataHotelDetails: ApiStrataDetails
}

export interface ApiBaseStrataApplication extends ApiBaseStrataRegistration {
  completingParty: ApiParty
}

export interface StrataApplicationPayload {
  registration: ApiBaseStrataApplication
}

export interface StrataApplicationResp extends StrataApplicationPayload {
  header: ApplicationHeader
}
