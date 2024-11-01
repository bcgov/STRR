export interface PlatBusiness extends StrrBusiness {
  hasCpbc: boolean | undefined
  cpbcLicenceNumber: string
  nonComplianceEmail: string
  nonComplianceEmailOptional: string
  takeDownEmail: string
  takeDownEmailOptional: string
}
