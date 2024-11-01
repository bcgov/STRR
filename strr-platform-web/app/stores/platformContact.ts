// TODO: rename / move to strr-base-web layer
import { z } from 'zod'
import type { Contact, StrrContact } from '#imports'
import {
  optionalOrEmptyString, getRequiredEmail, getRequiredNonEmptyString, getRequiredPhone
} from '~/utils/connect-validation'
import type { MultiFormValidationResult } from '~/interfaces/validation'

export const useStrrContactStore = defineStore('strr/contact', () => {
  const { t } = useI18n()
  const { userFullName } = storeToRefs(useConnectAccountStore())
  const getContactSchema = (completingParty = false) => {
    return z.object({
      firstName: getRequiredNonEmptyString(t('validation.name.first')),
      middleName: optionalOrEmptyString,
      lastName: getRequiredNonEmptyString(t('validation.name.last')),
      position: completingParty ? optionalOrEmptyString : getRequiredNonEmptyString(t('validation.position')),
      phone: getRequiredPhone(t('validation.required'), t('validation.phone.number')),
      faxNumber: optionalOrEmptyString,
      emailAddress: getRequiredEmail(t('validation.email'))
    })
  }

  const getUserNameChunks = () => {
    let firstName = ''
    let lastName = ''
    const nameChunks = userFullName.value.split(' ')
    if (nameChunks.length > 0) {
      firstName = nameChunks[0] as string
    }
    for (let i = 0; i < nameChunks.length; i++) {
      if (i === 0) {
        firstName = nameChunks[i] as string
      } else {
        // add other name chunks as last name
        lastName += ' ' + nameChunks[i] as string
      }
    }
    return {
      firstName,
      lastName
    }
  }

  const getNewContact = (isActiveUser = false): Contact => {
    const { firstName, lastName } = getUserNameChunks()
    return {
      firstName: isActiveUser ? firstName : '',
      middleName: '',
      lastName: isActiveUser ? lastName : '',
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
    }
  }, { deep: true })

  const secondaryRep = ref<StrrContact | undefined>(undefined)

  const compPartySchema = getContactSchema(true)
  const primaryRepSchema = getContactSchema(false)
  const secondaryRepSchema = getContactSchema(false)

  const validatePlatformContact = async (returnBool = false): Promise<MultiFormValidationResult | boolean> => {
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
    validatePlatformContact
  }
})
