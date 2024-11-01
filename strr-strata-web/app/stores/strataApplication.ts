import { z } from 'zod'
import type { MultiFormValidationResult } from '#imports'

export const useStrrPlatformApplication = defineStore('strr/platformApplication', () => {
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

  const validatePlatformConfirmation = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      getConfirmationSchema(), platformConfirmation, 'platform-confirmation-form'
    )

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  // TODO: update for strata api submission
  const createApplicationBody = () => {
    // const applicationBody: PlatformApplicationPayload = {
    //   registration: {
    //     registrationType: ApplicationType.PLATFORM,
    //     completingParty: formatParty(contactStore.completingParty),
    //     platformRepresentatives: [],
    //     businessDetails: formatBusinessDetails(businessStore.strataBusiness),
    //     platformDetails: formatPlatformDetails(detailsStore.strataDetails)
    //   }
    // }

    // if (platContactStore.primaryRep !== undefined) {
    //   applicationBody.registration.platformRepresentatives.push(
    //     formatRepresentative(platContactStore.primaryRep)
    //   )
    // }

    // if (platContactStore.secondaryRep !== undefined) {
    //   applicationBody.registration.platformRepresentatives.push(
    //     formatRepresentative(platContactStore.secondaryRep)
    //   )
    // }

    // return applicationBody
  }

  const submitPlatformApplication = async () => {
    const body = createApplicationBody()

    console.info('submitting application: ', body)

    // TODO: update type for strata payload
    return await postApplication<PlatformApplicationPayload>(body)
  }

  return {
    platformConfirmation,
    submitPlatformApplication,
    validatePlatformConfirmation
  }
})
