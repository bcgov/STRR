import { z } from 'zod'

export const useHostApplicationStore = defineStore('host/application', () => {
  const { t } = useI18n()
  const { postApplication } = useStrrApi()

  const propertyStore = useHostPropertyStore()
  const reqStore = usePropertyReqStore()
  const ownerStore = useHostOwnerStore()
  const documentStore = useDocumentStore()
  const confirmationSchema = z.object({
    agreedToRentalAct: z.boolean().refine(val => val, { message: t('validation.required') }),
    agreedToSubmit: z.boolean().refine(val => val, { message: t('validation.required') })
  })

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
      registration: {
        registrationType: ApplicationType.HOST,
        primaryContact: formatOwnerHostAPI(host as HostOwner),
        ...(cohost
          ? { secondaryContact: formatOwnerHostAPI(cohost) }
          : {}
        ),
        ...(propertyManger
          ? { propertyManager: formatOwnerPropertyManagerAPI(propertyManger) }
          : {}
        ),
        unitAddress: formatHostUnitAddressApi(propertyStore.unitAddress.address),
        unitDetails: formatHostUnitDetailsAPI(propertyStore.unitDetails, propertyStore.blInfo, reqStore.prRequirements),
        documents: documentStore.apiDocuments,
        strRequirements: reqStore.propertyReqs,
        listingDetails: []
      }
    }
  }

  const submitApplication = async () => {
    const body = createApplicationBody()

    // console.info('submitting application: ', body)

    const res = await postApplication<HostApplicationPayload, HostApplicationResp>(body) as HostApplicationResp

    const paymentToken = res.header.paymentToken
    const filingId = res.header.applicationNumber
    const applicationStatus = res.header.status

    return { paymentToken, filingId, applicationStatus }
  }

  const $reset = () => {
    propertyStore.$reset()
    reqStore.$reset()
    ownerStore.$reset()
    documentStore.$reset()
    userConfirmation.value = getEmptyConfirmation()
  }

  return {
    userConfirmation,
    confirmationSchema,
    validateUserConfirmation,
    submitApplication,
    $reset
  }
})
