// TODO: rename / move to strr-base-web layer
import { z } from 'zod'
import type { Contact, StrrContact } from '#imports'

export const useStrrContactStore = defineStore('strr/contact', () => {
  const { t } = useI18n()
  const { kcUser } = useKeycloak()
  const getContactSchema = (completingParty = false) => {
    return z.object({
      firstName: optionalOrEmptyString,
      middleName: optionalOrEmptyString,
      lastName: getRequiredNonEmptyString(t('validation.name.last')),
      position: completingParty ? optionalOrEmptyString : getRequiredNonEmptyString(t('validation.position')),
      phone: getRequiredPhone(t('validation.required'), t('validation.phone.number')),
      faxNumber: optionalOrEmptyString,
      emailAddress: getRequiredEmail(t('validation.email'))
    })
  }

  const getNewContact = (isActiveUser = false): Contact => {
    return {
      firstName: isActiveUser ? kcUser.value.firstName : '',
      middleName: '',
      lastName: isActiveUser ? kcUser.value.lastName : '',
      phone: {
        countryIso2: '',
        countryCode: '',
        number: '',
        extension: ''
      },
      faxNumber: '',
      emailAddress: ''
    }
  }

  const completingParty = ref<Contact>(getNewContact(true))

  const getNewRepresentative = (isActiveUser = false): StrrContact => {
    let contact = getNewContact(false)
    if (isActiveUser) {
      contact = JSON.parse(JSON.stringify(completingParty.value))
    }
    return {
      ...contact,
      position: ''
    }
  }

  const isCompletingPartyRep = ref<boolean | undefined>(undefined)
  const primaryRep = ref<StrrContact | undefined>(undefined)
  watch(primaryRep, (val) => {
    if (val && isCompletingPartyRep.value) {
      completingParty.value.emailAddress = val?.emailAddress
      completingParty.value.phone = val?.phone

      // for BCeID users we need to copy the names over from primary rep to completing party
      if (kcUser.value.loginSource === LoginSource.BCEID) {
        completingParty.value.firstName = val.firstName
        completingParty.value.middleName = val.middleName
        completingParty.value.lastName = val.lastName
      }
    }
  }, { deep: true })

  const secondaryRep = ref<StrrContact | undefined>(undefined)

  const compPartySchema = getContactSchema(true)
  const primaryRepSchema = getContactSchema(false)
  const secondaryRepSchema = getContactSchema(false)

  const validateContact = async (returnBool = false): Promise<MultiFormValidationResult | boolean> => {
    const validations = [
      validateSchemaAgainstState(compPartySchema, completingParty.value, 'completing-party-form'),
      validateSchemaAgainstState(primaryRepSchema, primaryRep.value, 'primary-rep-form')
    ]

    if (secondaryRep.value !== undefined) {
      validations.push(validateSchemaAgainstState(secondaryRepSchema, secondaryRep.value, 'secondary-rep-form'))
    }

    const results = await Promise.all(validations)

    if (isCompletingPartyRep.value === undefined) {
      results.unshift({
        formId: 'completing-party-radio-group',
        errors: [],
        success: false
      })
    }

    if (returnBool) {
      return results.every(result => result.success === true)
    } else {
      return results
    }
  }

  const $reset = () => {
    completingParty.value = getNewContact(true)
    isCompletingPartyRep.value = undefined
    primaryRep.value = undefined
    secondaryRep.value = undefined
  }

  return {
    completingParty,
    isCompletingPartyRep,
    primaryRep,
    secondaryRep,
    compPartySchema,
    primaryRepSchema,
    secondaryRepSchema,
    getContactSchema,
    getNewContact,
    getNewRepresentative,
    validateContact,
    $reset
  }
})
