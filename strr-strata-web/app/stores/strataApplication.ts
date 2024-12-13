import { z } from 'zod'
import type { MultiFormValidationResult, StrataApplicationPayload, StrataApplicationResp, StrrBusiness } from '#imports'
import { formatBusinessDetails, formatStrataDetails } from '~/utils/strata-formating'

export const useStrrStrataApplicationStore = defineStore('strr/strataApplication', () => {
  const { t } = useI18n()
  const { postApplication } = useStrrApi()
  const contactStore = useStrrContactStore()
  const businessStore = useStrrStrataBusinessStore()
  const detailsStore = useStrrStrataDetailsStore()

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
      registration: {
        registrationType: ApplicationType.STRATA_HOTEL,
        completingParty: formatParty(contactStore.completingParty),
        businessDetails: formatBusinessDetails(businessStore.strataBusiness || {} as StrrBusiness),
        strataHotelRepresentatives: [],
        strataHotelDetails: formatStrataDetails(detailsStore.strataDetails)
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

  const submitStrataApplication = async () => {
    const body = createApplicationBody()

    const res = await postApplication<StrataApplicationPayload, StrataApplicationResp>(body) as StrataApplicationResp

    const paymentToken = res.header.paymentToken
    const filingId = res.header.applicationNumber
    const applicationStatus = res.header.status

    return { paymentToken, filingId, applicationStatus }
  }

  const $reset = () => {
    contactStore.$reset()
    businessStore.$reset()
    detailsStore.$reset()
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
