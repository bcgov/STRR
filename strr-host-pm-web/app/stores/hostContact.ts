import { z } from 'zod'

export const useHostContactStore = defineStore('host/contact', () => {
  // TODO: pull common pieces of this and useStrrContactStore into base composable
  const { t } = useI18n()
  const { getNewContact } = useStrrContactStore()

  const getHostContactSchema = (type: ContactType) => {
    return z.object({
      role: z.enum([ContactRole.HOST, ContactRole.PROPERTY_MANAGER]),
      contactType: z.enum([type]),
      firstName: getRequiredNonEmptyString(t('validation.name.first')),
      middleName: optionalOrEmptyString,
      lastName: getRequiredNonEmptyString(t('validation.name.last')),
      preferredName: optionalOrEmptyString,
      faxNumber: optionalOrEmptyString,
      emailAddress: getRequiredEmail(t('validation.email')),
      phone: getRequiredPhone(t('validation.required'), t('validation.phone.number')),
      mailingAddress: getRequiredAddress(
        t('validation.address.street'),
        t('validation.address.city'),
        t('validation.address.region'),
        // TODO: postal code optional for individuals (a residential address can't require it?)
        t('validation.address.postalCode'),
        t('validation.address.country')
      ),
      businessLegalName: type === ContactType.BUSINESS
        ? getRequiredNonEmptyString(t('validation.business.legalName'))
        : optionalOrEmptyString,
      businessNumber: optionalOrEmptyString,
      dateOfBirth: type === ContactType.INDIVIDUAL
        ? getRequiredNonEmptyString(t('validation.dateOfBirth'))
        : optionalOrEmptyString
    })
  }

  const getNewHostContact = (isActiveUser = false, contactType: ContactType): HostContact => ({
    ...(getNewContact(isActiveUser)),
    contactType,
    preferredName: '',
    dateOfBirth: '',
    businessLegalName: '',
    businessNumber: '',
    mailingAddress: {
      street: '',
      streetAdditional: '',
      region: '',
      city: '',
      country: '',
      postalCode: '',
      locationDescription: ''
    }
  })

  const primaryContact = ref<HostContact | undefined>(undefined)
  const secondaryContact = ref<HostContact | undefined>(undefined)

  const propertyManager = ref<HostContact | undefined>(undefined)

  const validateContact = async (returnBool = false): Promise<MultiFormValidationResult | boolean> => {
    if (!primaryContact.value) {
      return false
    }
    const validations = [
      validateSchemaAgainstState(
        getHostContactSchema(primaryContact.value.contactType),
        primaryContact.value,
        'primary-contact-form')
    ]

    if (secondaryContact.value !== undefined) {
      validations.push(validateSchemaAgainstState(
        getHostContactSchema(secondaryContact.value.contactType),
        secondaryContact.value,
        'second-contact-form'))
    }

    if (propertyManager.value !== undefined) {
      validations.push(validateSchemaAgainstState(
        getHostContactSchema(propertyManager.value.contactType),
        propertyManager.value,
        'property-manager-form'))
    }

    const results = await Promise.all(validations)

    if (returnBool) {
      return results.every(result => result.success === true)
    } else {
      return results
    }
  }

  const $reset = () => {
    primaryContact.value = undefined
    secondaryContact.value = undefined
    propertyManager.value = undefined
  }

  return {
    primaryContact,
    secondaryContact,
    propertyManager,
    getHostContactSchema,
    getNewHostContact,
    validateContact,
    $reset
  }
})
