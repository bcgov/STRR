import { z } from 'zod'

export const useStrrPlatformApplication = defineStore('strr/platformApplication', () => {
  const { t } = useI18n()
  const { postApplication } = useStrrApi()
  const platContactStore = useStrrContactStore()
  const platBusinessStore = useStrrPlatformBusiness()
  const platDetailsStore = useStrrPlatformDetails()

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
        businessDetails: formatBusinessDetails(platBusinessStore.platformBusiness),
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

    console.info('submitting application: ', body)

    return await postApplication<PlatformApplicationPayload>(body)
  }

  return {
    platformConfirmation,
    platformConfirmationSchema,
    submitPlatformApplication,
    validatePlatformConfirmation
  }
})
