export interface ApiStrataDetails {
  brands: StrrBrand[]
  buildings: ApiAddress[]
  location: ApiAddress
  numberOfUnits: number
}

export interface ApiBaseStrataRegistration extends ApiBaseRegistration {
  strataHotelRepresentatives: ApiRep[]
  strataHotelDetails: ApiStrataDetails
}

export interface StrataRegistrationResp extends ApiBaseStrataRegistration, ApiExtraRegistrationDetails {
}

export interface StrataApplicationPayload {
  registration: ApiBaseStrataRegistration
}

export interface StrataApplicationResp extends StrataApplicationPayload {
  header: ApplicationHeader
}
