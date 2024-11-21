import { z } from 'zod'
import type { ApiDocument, ApiResidence } from '~/interfaces/host-api'

export const useHostApplicationStore = defineStore('host/application', () => {
  // const { t } = useI18n()

  const residenceSchema = z.object({
    isPrincipalResidence: z.boolean(),
    agreedToRentalAct: z.boolean(),
    nonPrincipalOption: optionalOrEmptyString,
    specifiedServiceProvider: optionalOrEmptyString,
    agreedToSubmit: z.boolean()
  })

  const getEmptyResidenceDetails = () => ({
    isPrincipalResidence: undefined,
    agreedToRentalAct: undefined,
    nonPrincipalOption: '',
    specifiedServiceProvider: '',
    agreedToSubmit: undefined
  })

  const residenceDetails = ref<ApiResidence>(getEmptyResidenceDetails())
  const documents = ref<ApiDocument[]>([])

  // TODO: add document schema?
  // TODO: add document - takes file upload, post to api, push resp to documents ref
  const removeDocumentAtIndex = (index: number) => {
    documents.value.splice(index, 1)
  }

  // TODO: update for application pieces
  // const validateApplication = (returnBool = false): MultiFormValidationResult | boolean => {
  //   const result = validateSchemaAgainstState(propertySchema, property.value, 'property-form')

  //   if (returnBool) {
  //     return result.success === true
  //   } else {
  //     return [result]
  //   }
  // }

  const $reset = () => {
    residenceDetails.value = getEmptyResidenceDetails()
    documents.value = []
  }

  return {
    residenceDetails,
    documents,
    residenceSchema,
    removeDocumentAtIndex,
    $reset
  }
})
