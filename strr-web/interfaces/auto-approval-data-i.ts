export interface AutoApprovalDataI {
  record: {
    id: number,
    applicationNumber: string,
    creationDate: string,
    record: {
      renting?: boolean,
      serviceProvider?: boolean,
      prExempt?: boolean,
      addressMatch?: boolean,
      businessLicenseRequired?: boolean,
      businessLicenseRequiredNotProvided?: boolean,
      businessLicenseRequiredProvided?: boolean,
      businessLicenseNotRequiredNotProvided?: boolean,
      titleCheck?: boolean
    }
  }
}
