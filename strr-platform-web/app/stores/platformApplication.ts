import { z } from 'zod'

export const useStrrPlatformApplication = defineStore('strr/platformApplication', () => {
  const { t } = useI18n()
  const { postApplication } = useStrrApi()
  const platContactStore = useStrrContactStore()
  const platBusinessStore = useStrrPlatformBusiness()
  const platDetailsStore = useStrrPlatformDetails()

  const platformConfirmation = reactive({
    confirmation: false
  })

  const getConfirmationSchema = () => z.object({
    confirmation: z.boolean().refine(val => val === true, {
      message: t('validation.confirm')
    })
  })

  const platformConfirmationSchema = getConfirmationSchema()

  const validatePlatformConfirmation = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      platformConfirmationSchema, platformConfirmation, 'platform-confirmation-form'
    )

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  const createApplicationBody = (): PlatformApplicationPayload => {
    const applicationBody: PlatformApplicationPayload = {
      registration: {
        registrationType: ApplicationType.PLATFORM,
        completingParty: formatParty(platContactStore.completingParty),
        platformRepresentatives: [],
        businessDetails: formatBusinessDetails(platBusinessStore.platformBusiness || {} as PlatBusiness),
        platformDetails: formatPlatformDetails(platDetailsStore.platformDetails)
      }
    }

    if (platContactStore.primaryRep !== undefined) {
      applicationBody.registration.platformRepresentatives.push(
        formatRepresentative(platContactStore.primaryRep)
      )
    }

    if (platContactStore.secondaryRep !== undefined) {
      applicationBody.registration.platformRepresentatives.push(
        formatRepresentative(platContactStore.secondaryRep)
      )
    }

    return applicationBody
  }

  const submitPlatformApplication = async () => {
    const body = createApplicationBody()

    // console.info('submitting application: ', body)

    return await postApplication<PlatformApplicationPayload, PlatformApplicationResp>(body)
  }

  const $reset = () => {
    platContactStore.$reset()
    platBusinessStore.$reset()
    platDetailsStore.$reset()
    platformConfirmation.confirmDelistAndCancelBookings = false
    platformConfirmation.confirmInfoAccuracy = false
  }

  return {
    platformConfirmation,
    platformConfirmationSchema,
    submitPlatformApplication,
    validatePlatformConfirmation,
    $reset
  }
})
