import { validateEmailRfc5322Regex, validateEmailRfc6532Regex } from '~/utils/connect-validation'

export const setApplicaitonHeaderDetails = () => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { activeApplicationInfo, isPaidApplication } = useStrrPlatformStore()
  const { details, bottomButtons } = storeToRefs(useConnectDetailsHeaderStore())

  if (activeApplicationInfo?.hostStatus) {
    details.value = { chip: { text: activeApplicationInfo.hostStatus, colour: 'yellow' } }
  }
  if (isPaidApplication) {
    bottomButtons.value = [
      {
        action: () => { console.info('Receipt') },
        label: t('word.Receipt'),
        // TODO: find/replace with correct icon
        icon: 'i-mdi-file-download-outline'
      }
    ]
  }
}

export const setRegistrationHeaderDetails = () => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { activePlatform } = useStrrPlatformStore()
  const { details, bottomButtons } = storeToRefs(useConnectDetailsHeaderStore())

  // @ts-expect-error - activePlatform.value.status will always exist in this case
  details.value = { chip: { text: activePlatform.status } }
  bottomButtons.value = [
    // TODO: determine if this is a valid action / add label to locales
    {
      action: () => { console.info('View and Change') },
      label: 'View and Change Platform Information',
      icon: 'i-mdi-file-document-edit-outline'
    },
    // TODO: pending - remove as platforms won't have a certificate
    {
      action: () => { console.info('Certificate') },
      label: 'Certificate',
      icon: 'i-mdi-file-download-outline'
    },
    {
      action: () => { console.info('Receipt') },
      label: t('word.Receipt'),
      // TODO: find/replace with correct icon
      icon: 'i-mdi-file-download-outline'
    }
  ]
}

export const setSideHeaderDetails = () => {
  // set right side details of header
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { isRegistration } = useStrrPlatformStore()
  const { platformBusiness } = useStrrPlatformBusiness()
  const { sideDetails } = storeToRefs(useConnectDetailsHeaderStore())

  const sideDetailsList = [
    {
      label: t('label.busNum'),
      value: platformBusiness.businessNumber ?? t('text.notEntered')
    },
    { label: t('platform.label.cpbcNum'), value: platformBusiness.cpbcLicenceNumber ?? t('text.notEntered') },
    {
      label: t('platform.label.noncomplianceEmail'),
      value: platformBusiness.nonComplianceEmail
    },
    { label: t('platform.label.takedownEmail'), value: platformBusiness.takeDownEmail }
  ]
  if (isRegistration) {
    // add edit buttons to noncompliance / takedown emails
    // @ts-expect-error - invalid ts warning, 'sideDetailsList[2]' will always be defined here ^
    sideDetailsList[2].edit = {
      isEditing: false,
      validation: {
        error: '',
        validate: (val: string) => {
          if (validateEmailRfc5322Regex(val) && validateEmailRfc6532Regex(val)) {
            return ''
          }
          return t('validation.email')
        }
      },
      action: () => console.info('PATCH - noncompliance email with ', platformBusiness.nonComplianceEmail)
    }
    // @ts-expect-error - invalid ts warning, 'sideDetailsList[3]' will always be defined here
    sideDetailsList[3].edit = {
      isEditing: false,
      validation: {
        error: '',
        validate: (val: string) => {
          if (validateEmailRfc5322Regex(val) && validateEmailRfc6532Regex(val)) {
            return ''
          }
          return t('validation.email')
        }
      },
      action: () => console.info('PATCH - takedown email with ', platformBusiness.takeDownEmail)
    }
  }
  sideDetails.value = sideDetailsList
}

export const getDashboardAddresses = () => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { platformBusiness } = useStrrPlatformBusiness()

  const addresses: ConnectAccordionItem[] = [{
    defaultOpen: true,
    showAvatar: false,
    label: t('label.mailingAddress'),
    values: [
      {
        icon: 'i-mdi-email-outline',
        address: platformBusiness.mailingAddress
      }
    ]
  }]
  if (platformBusiness.hasRegOffAtt) {
    addresses.push({
      showAvatar: false,
      label: t('platform.label.registeredOfficeAttorney'),
      values: [
        {
          class: 'pl-7',
          label: t('platform.label.attName'),
          text: platformBusiness.regOfficeOrAtt.attorneyName ?? t('label.notAvailable')
        },
        {
          class: 'pl-7',
          label: t('label.registeredOffice'),
          address: platformBusiness.regOfficeOrAtt.mailingAddress
        }
      ]
    })
  }
  return addresses
}

export const getRepItem = (rep: PlatformContact): ConnectAccordionItem => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  return {
    showAvatar: true,
    label: `${rep.firstName || ''} ` +
      `${rep.middleName || ''} ` +
      `${rep.lastName || ''}`.replaceAll('  ', '').trim(),
    values: [
      { text: rep?.position },
      {
        icon: 'i-mdi-at',
        iconClass: 'text-base mt-[2px]',
        text: rep.emailAddress ?? t('label.notEntered')
      },
      {
        icon: 'i-mdi-phone',
        iconClass: 'text-base mt-[2px]',
        // TODO: update display to have correct mask display and country code
        text: rep.phone.number ?? t('label.notEntered')
      },
      {
        icon: 'i-mdi-fax',
        iconClass: 'text-base mt-[2px]',
        text: rep.faxNumber ?? t('label.notEntered')
      }
    ]
  }
}

export const getDashboardRepresentives = (): ConnectAccordionItem[] => {
  const { primaryRep, secondaryRep } = useStrrPlatformContact()
  if (!primaryRep) {
    return []
  }
  const rep = getRepItem(primaryRep)
  rep.defaultOpen = true
  const reps = [rep]
  if (secondaryRep) {
    reps.push(getRepItem(secondaryRep))
  }
  return reps
}
