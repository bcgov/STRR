export interface StrrBusiness {
  legalName: string
  homeJurisdiction: string
  businessNumber: string
  mailingAddress: ConnectAddress
  hasRegOffAtt: boolean | undefined
  regOfficeOrAtt: {
    attorneyName: string
    sameAsMailAddress: boolean
    mailingAddress: ConnectAddress
  }
}
