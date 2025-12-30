import { z } from 'zod'
import type { MultiFormValidationResult, StrataApplicationPayload, StrataApplicationResp, StrrBusiness } from '#imports'
import { formatBusinessDetails, formatStrataDetails } from '~/utils/strata-formating'

export const useStrrStrataApplicationStore = defineStore('strr/strataApplication', () => {
  const { t } = useNuxtApp().$i18n
  const { postApplication } = useStrrApi()
  const contactStore = useStrrContactStore()
  const businessStore = useStrrStrataBusinessStore()
  const detailsStore = useStrrStrataDetailsStore()
  const documentStore = useDocumentStore()
  const strataStore = useStrrStrataStore()
  const { isRegistrationRenewal, registration, application } = storeToRefs(strataStore)

  const confirmation = reactive({
    confirmation: false
  })

  const confirmationSchema = z.object({
    confirmation: z.boolean().refine(val => val === true, {
      message: t('validation.confirm')
    })
  })

  const validateStrataConfirmation = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      confirmationSchema, confirmation, 'strata-confirmation-form'
    )

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  const createApplicationBody = () => {
    const applicationBody: StrataApplicationPayload = {
      header: {
        paymentMethod: useConnectFeeStore().userSelectedPaymentMethod,
        ...(isRegistrationRenewal.value && {
          // to keep renewal application/draft/registration linked together we must have the registration id here
          registrationId: registration.value?.id || application.value?.header.registrationId,
          applicationType: 'renewal'
        })
      },
      registration: {
        registrationType: ApplicationType.STRATA_HOTEL,
        completingParty: formatParty(contactStore.completingParty),
        businessDetails: formatBusinessDetails(businessStore.strataBusiness || {} as StrrBusiness),
        strataHotelRepresentatives: [],
        strataHotelDetails: formatStrataDetails(detailsStore.strataDetails),
        documents: documentStore.apiDocuments
      }
    }

    if (contactStore.primaryRep !== undefined) {
      applicationBody.registration.strataHotelRepresentatives.push(
        formatRepresentative(contactStore.primaryRep)
      )
    }

    if (contactStore.secondaryRep !== undefined) {
      applicationBody.registration.strataHotelRepresentatives.push(
        formatRepresentative(contactStore.secondaryRep)
      )
    }

    return applicationBody
  }

  const submitStrataApplication = async (isDraft = false, applicationId?: string) => {
    const body = createApplicationBody()

    const res = await postApplication<StrataApplicationPayload, StrataApplicationResp>(
      body,
      isDraft,
      applicationId
    ) as StrataApplicationResp

    const paymentToken = res.header.paymentToken
    const filingId = res.header.applicationNumber
    const applicationStatus = res.header.status

    return { paymentToken, filingId, applicationStatus }
  }

  const $reset = () => {
    contactStore.$reset()
    businessStore.$reset()
    detailsStore.$reset()
    documentStore.$reset()
    confirmation.confirmation = false
  }

  return {
    confirmation,
    confirmationSchema,
    submitStrataApplication,
    validateStrataConfirmation,
    $reset
  }
})
