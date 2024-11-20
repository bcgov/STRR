import { formatBusinessDetailsUI, formatStrataDetailsUI } from '~/utils/strata-formating'

interface DocumentUploadI {
  fileKey: string
  fileName: string
  fileType: string
}

interface PropertyManagerContactI {
  firstName: string
  middleName: string | undefined
  lastName: string
  preferredName: string | undefined
  phoneNumber: string
  extension: string | undefined
  faxNumber: string | undefined
  emailAddress: string
}

interface PropertyManagerBusinessAddressI {
  address: string
  country: string
  addressLineTwo: string | undefined
  city: string
  province: string
  postalCode: string
}

interface PropertyManagerI {
  businessLegalName: string | undefined
  businessNumber: string | undefined
  businessMailingAddress: PropertyManagerBusinessAddressI
  contact: PropertyManagerContactI
  initiatedByPropertyManager: boolean | undefined
}

interface UnitAddressAPII {
  streetNumber: string
  streetName: string
  unitNumber?: string
  addressLineTwo?: string
  city: string
  postalCode: string
  province: string
  country: string
  nickname: string
}

interface ContactI {
  socialInsuranceNumber: string
  businessNumber: string
  dateOfBirth: string
  details: {
    emailAddress: string
    extension: string
    faxNumber: string
    phoneNumber: string
    preferredName: string
  }
  mailingAddress: {
    address: string
    addressLineTwo: string
    city: string
    country: string
    postalCode: string
    province: string
  }
  name: {
    firstName: string
    lastName: string
    middleName: string
  }
}

export interface PrincipalResidenceI {
  agreedToRentalAct: boolean
  agreedToSubmit: boolean
  isPrincipalResidence: boolean
  nonPrincipalOption: string
  specifiedServiceProvider: string
}

interface RegistrationI {
  id: number
  registration_number?: string
  invoices: {
    'invoice_id': number
    'payment_account': string
    'payment_completion_date': string
    'payment_status_code': string
    'registration_id': number
  }[],
  listingDetails: { url: string }[]
  primaryContact: ContactI
  secondaryContact: ContactI | null
  principalResidence: PrincipalResidenceI
  propertyManager?: PropertyManagerI
  sbc_account_id: number
  status: string
  submissionDate: string
  unitAddress: UnitAddressAPII
  unitDetails: {
    parcelIdentifier?: string,
    businessLicense?: string,
    businessLicenseExpiryDate?: string,
    propertyType: string,
    ownershipType: string,
    rentalUnitSpaceType: string,
    isUnitOnPrincipalResidenceProperty: boolean,
    hostResidence: string,
    numberOfRoomsForRent: number
  },
  updatedDate: string
  user_id: number
  documents?: DocumentUploadI[]
}

export const useStrrStrataStore = defineStore('strr/strata', () => {
  // TODO: move common pieces of strata and platform to base layer composable
  const { getAccountApplications } = useStrrApi()
  const contactStore = useStrrContactStore()
  const businessStore = useStrrStrataBusinessStore()
  const detailsStore = useStrrStrataDetailsStore()
  const { completingParty, primaryRep, secondaryRep } = storeToRefs(contactStore)
  const { strataBusiness } = storeToRefs(businessStore)
  const { strataDetails } = storeToRefs(detailsStore)
  const { t } = useI18n()

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    loadPermitData,
    downloadApplicationReceipt
  } = useStrrBasePermit<StrataRegistrationResp, StrataApplicationResp>()

  const loadStrata = async (applicationId: string) => {
    await loadPermitData(applicationId)
    if (application.value) {
      // set completing party info (this data is only in the application)
      completingParty.value = formatPartyUI(application.value.registration.completingParty)
    }
    if (showPermitDetails.value) {
      // set relevant sub store values to active platform data
      primaryRep.value = formatRepresentativeUI(permitDetails.value.strataHotelRepresentatives[0])
      // should only ever be 2 reps at most
      if (permitDetails.value.strataHotelRepresentatives?.length > 1) {
        secondaryRep.value = formatRepresentativeUI(permitDetails.value.strataHotelRepresentatives[1])
      }
      strataBusiness.value = formatBusinessDetailsUI(permitDetails.value.businessDetails)
      strataDetails.value = formatStrataDetailsUI(permitDetails.value.strataHotelDetails)
    }
  }

  const loadHostPmList = async () => {
    // Load the full list of strata hotel applications
    return await getAccountApplications(undefined, ApplicationType.HOST)
      .catch((e) => {
        logFetchError(e, 'Unable to load account applications')
        return undefined
      }).then((response) => {
        if (response) {
          return (response as Array<any>).map(app => ({
            property: app.registration.unitAddress,
            number: app.header.registrationNumber || app.header.applicationNumber,
            date: app.header.registrationStartDate || app.header.applicationDateTime,
            lastStatusChange: getLastStatusChangeColumn(app.header),
            daysToExpiry: getDaysToExpiryColumn(app.header),
            status: app.header.registrationStatus || app.header.hostStatus,
            applicationNumber: app.header.applicationNumber // always used for view action
          }))
        }
        return []
      })
  }

  const $reset = () => {
    contactStore.$reset()
    businessStore.$reset()
    detailsStore.$reset()
    application.value = undefined
    registration.value = undefined
  }

  return {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    downloadApplicationReceipt,
    loadStrata,
    loadHostPmList,
    $reset
  }
})
