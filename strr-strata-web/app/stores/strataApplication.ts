import { z } from 'zod'
import type { MultiFormValidationResult, StrataApplicationPayload } from '#imports'
import { formatBusinessDetails, formatStrataDetails } from '~/utils/strata-formating'

export const useStrrStrataApplicationStore = defineStore('strr/strataApplication', () => {
  // TODO: WIP - updating for strata
  const { t } = useI18n()
  const { postApplication } = useStrrApi()
  const contactStore = useStrrContactStore()
  const businessStore = useStrrStrataBusinessStore()
  const detailsStore = useStrrStrataDetailsStore()

  // TODO: update confirmation stuff for strata
  const platformConfirmation = reactive({
    confirmInfoAccuracy: false,
    confirmDelistAndCancelBookings: false
  })

  const getConfirmationSchema = () => z.object({
    confirmInfoAccuracy: z.boolean().refine(val => val === true, {
      message: t('validation.confirm')
    }),
    confirmDelistAndCancelBookings: z.boolean().refine(val => val === true, {
      message: t('validation.confirm')
    })
  })

  const validateStrataConfirmation = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      getConfirmationSchema(), platformConfirmation, 'platform-confirmation-form'
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

  const submitPlatformApplication = async () => {
    const body = createApplicationBody()

    console.info('submitting application: ', body)

    return await postApplication<StrataApplicationPayload>(body)
  }

  return {
    platformConfirmation,
    submitPlatformApplication,
    validateStrataConfirmation
  }
})
