export interface ApiStrataDetails {
  brand: StrrBrand
  buildings: ApiAddress[]
  location: ApiAddress
  numberOfUnits: number
}

export interface ApiBaseStrataRegistration extends ApiBaseRegistration {
  strataHotelRepresentatives: ApiRep[]
  strataHotelDetails: ApiStrataDetails
}

export interface ApiBaseStrataApplication extends ApiBaseStrataRegistration {
  completingParty: ApiParty
}

export interface StrataRegistrationResp extends ApiBaseStrataRegistration, ApiExtraRegistrationDetails {
}

export interface StrataApplicationPayload {
  registration: ApiBaseStrataApplication
}

export interface StrataApplicationResp extends StrataApplicationPayload {
  header: ApplicationHeader
}
