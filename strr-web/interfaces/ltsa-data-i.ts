export interface LtsaDataI {
  record: {
    id: number,
    applicationNumber: string,
    creationDate: string,
    record: {
      titleStatus: string,
      titleIdentifier: {
        titleNumber: string,
        landTitleDistrict: string
      },
      tombstone: {
        applicationReceivedDate: string,
        enteredDate: string,
        titleRemarks: string,
        marketValueAmount: string,
        fromTitles: {
          titleNumber: string,
          landTitleDistrict: string
        }[],
        natureOfTransfers: {
          transferReason: string
        }[]
      },
      ownershipGroups: {
        jointTenancyIndication: boolean,
        interestFractionNumerator: string,
        interestFractionDenominator: string,
        ownershipRemarks: string,
        titleOwners: {
          lastNameOrCorpName1: string,
          givenName: string,
          incorporationNumber: string,
          occupationDescription: string,
          address: {
            addressLine1: string,
            addressLine2: string,
            city: string,
            province: string,
            provinceName: string,
            country: string,
            postalCode: string
          }
        }[]
      }[],
      descriptionsOfLand: {
        parcelIdentifier: string,
        fullLegalDescription: string,
        parcelStatus: string
      }[],
      taxAuthorities: {
        authorityName: string
      }[]
    }
  }
}
