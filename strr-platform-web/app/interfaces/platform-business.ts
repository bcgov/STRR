export interface PlatBusiness {
  legalName: string
  homeJurisdiction: string
  businessNumber: string
  hasCpbc: boolean | undefined
  cpbcLicenceNumber: string
  nonComplianceEmail: string
  nonComplianceEmailOptional: string
  takeDownEmail: string
  takeDownEmailOptional: string
  mailingAddress: ConnectAddress
  hasRegOffAtt: boolean | undefined
  regOfficeOrAtt: {
    attorneyName: string
    sameAsMailAddress: boolean
    mailingAddress: ConnectAddress
  }
}
