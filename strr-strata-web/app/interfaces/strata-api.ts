export interface ApiStrataDetails {
  brands: StrrBrand[]
  listingSize: number
}

export interface ApiBaseStrataRegistration extends ApiBaseRegistration {
  strataRepresentatives: ApiRep[]
  strataDetails: ApiStrataDetails
}

export interface StrataRegistrationResp extends ApiBaseStrataRegistration, ApiExtraRegistrationDetails {
}

export interface StrataApplicationPayload {
  registration: ApiBaseStrataRegistration
}

export interface StrataApplicationResp extends StrataApplicationPayload {
  header: ApplicationHeader
}
