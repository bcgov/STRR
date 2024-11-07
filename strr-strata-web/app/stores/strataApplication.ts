import { z } from 'zod'
import type { MultiFormValidationResult, StrataApplicationPayload, StrataApplicationResp } from '#imports'
import { formatBusinessDetails, formatStrataDetails } from '~/utils/strata-formating'

export const useStrrStrataApplicationStore = defineStore('strr/strataApplication', () => {
  const { t } = useI18n()
  const { postApplication } = useStrrApi()
  const contactStore = useStrrContactStore()
  const businessStore = useStrrStrataBusinessStore()
  const detailsStore = useStrrStrataDetailsStore()

  // TODO: update confirmation stuff for strata
  const confirmation = reactive({
    confirmInfoAccuracy: false,
    confirmDelistAndCancelBookings: false
  })

  const confirmationSchema = z.object({
    confirmInfoAccuracy: z.boolean().refine(val => val === true, {
      message: t('validation.confirm')
    }),
    confirmDelistAndCancelBookings: z.boolean().refine(val => val === true, {
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
        businessDetails: formatBusinessDetails(businessStore.strataBusiness),
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

    // TODO: confirm if jobTitle for completing party is required for strata application
    // @ts-expect-error - temporary until we confirm requirements
    body.registration.completingParty.jobTitle = 'Completing Party Job Title'

    console.info('submitting application: ', body)

    return await postApplication<StrataApplicationPayload, StrataApplicationResp>(body)
  }

  return {
    confirmation,
    confirmationSchema,
    submitStrataApplication,
    validateStrataConfirmation
  }
})
