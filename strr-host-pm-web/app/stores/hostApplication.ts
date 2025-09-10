import { z } from 'zod'

export const useHostApplicationStore = defineStore('host/application', () => {
  const { t } = useI18n()
  const { postApplication } = useStrrApi()
  const isAddressHelpExpanded = ref(false)
  const propertyStore = useHostPropertyStore()
  const reqStore = usePropertyReqStore()
  const ownerStore = useHostOwnerStore()
  const documentStore = useDocumentStore()
  const confirmationSchema = z.object({
    agreedToRentalAct: z.boolean().refine(val => val, { message: t('validation.required') }),
    agreedToSubmit: z.boolean().refine(val => val, { message: t('validation.required') })
  })
  const permitStore = useHostPermitStore()
  const { isRegistrationRenewal, registration } = storeToRefs(permitStore)

  const getEmptyConfirmation = () => ({
    agreedToRentalAct: false,
    agreedToSubmit: false
  })

  const userConfirmation = ref(getEmptyConfirmation())
  watch(
    () => (
      !reqStore.propertyReqs.isPrincipalResidenceRequired ||
      reqStore.prRequirements.prExemptionReason !== undefined
    ),
    () => {
      // A change has been made to the list of agreed terms so the user will need to reconfirm
      userConfirmation.value.agreedToRentalAct = false
    }
  )

  const validateUserConfirmation = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(confirmationSchema, userConfirmation.value, 'confirmation-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  const createApplicationBody = (): HostApplicationPayload => {
    const host = ownerStore.findByRole(OwnerRole.HOST)
    const cohost = ownerStore.findByRole(OwnerRole.CO_HOST)
    const propertyManger = ownerStore.findByRole(OwnerRole.PROPERTY_MANAGER)

    return {
      header: {
        paymentMethod: useConnectFeeStore().userSelectedPaymentMethod,
        ...(isRegistrationRenewal.value && {
          registrationId: registration.value?.id,
          applicationType: 'renewal'
        })
      },
      registration: {
        registrationType: ApplicationType.HOST,
        ...(host
          ? { primaryContact: formatOwnerHostAPI(host as HostOwner) }
          : {}
        ),
        ...(cohost
          ? { secondaryContact: formatOwnerHostAPI(cohost) }
          : {}
        ),
        ...(propertyManger
          ? { propertyManager: formatOwnerPropertyManagerAPI(propertyManger) }
          : {}
        ),
        unitAddress: formatHostUnitAddressApi(propertyStore.unitAddress.address),
        unitDetails: formatHostUnitDetailsAPI(
          propertyStore.unitDetails,
          propertyStore.blInfo,
          reqStore.prRequirements,
          reqStore.blRequirements,
          reqStore.strataHotelCategory
        ),
        documents: documentStore.apiDocuments,
        strRequirements: reqStore.propertyReqs,
        listingDetails: []
      }
    }
  }

  const submitApplication = async (isDraft = false, applicationId?: string) => {
    const body = createApplicationBody()
    const res = await postApplication<HostApplicationPayload, HostApplicationResp>(
      body,
      isDraft,
      applicationId
    ) as HostApplicationResp

    const paymentToken = res.header.paymentToken
    const filingId = res.header.applicationNumber
    const applicationStatus = res.header.status

    return { paymentToken, filingId, applicationStatus }
  }

  function showAddressHelp () {
    isAddressHelpExpanded.value = true
  }

  function hideAddressHelp () {
    isAddressHelpExpanded.value = false
  }

  function toggleAddressHelp () {
    isAddressHelpExpanded.value = !isAddressHelpExpanded.value
  }

  const $reset = () => {
    propertyStore.$reset()
    reqStore.$reset()
    ownerStore.$reset()
    documentStore.$reset()
    userConfirmation.value = getEmptyConfirmation()
    isAddressHelpExpanded.value = false
  }

  return {
    userConfirmation,
    confirmationSchema,
    validateUserConfirmation,
    submitApplication,
    isAddressHelpExpanded,
    showAddressHelp,
    hideAddressHelp,
    toggleAddressHelp,
    $reset
  }
})
