export const setApplicationHeaderDetails = (showReceipt: boolean, hostStatus?: string) => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { details, bottomButtons } = storeToRefs(useConnectDetailsHeaderStore())

  if (hostStatus) {
    details.value = { chip: { text: hostStatus, colour: 'yellow' } }
  }
  if (showReceipt) {
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

export const setRegistrationHeaderDetails = (status: ApplicationStatus) => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { details, bottomButtons } = storeToRefs(useConnectDetailsHeaderStore())

  details.value = { chip: { text: status } }
  bottomButtons.value = [
    // TODO: determine if this is a valid action / add label to locales
    // {
    //   action: () => { console.info('View and Change') },
    //   label: 'View and Change Platform Information',
    //   icon: 'i-mdi-file-document-edit-outline'
    // },
    // FUTURE: add back in once certificate is built
    // {
    //   action: () => { console.info('Certificate') },
    //   label: 'Certificate',
    //   icon: 'i-mdi-file-download-outline'
    // },
    {
      action: () => { console.info('Receipt') },
      label: t('word.Receipt'),
      // TODO: find/replace with correct icon
      icon: 'i-mdi-file-download-outline'
    }
  ]
}

export const setSideHeaderDetails = (
  business: StrrBusiness,
  registration?: ApiExtraRegistrationDetails,
  application?: ApplicationHeader
) => {
  // set right side details of header
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { sideDetails } = storeToRefs(useConnectDetailsHeaderStore())
  const sideDetailsList = []
  if (registration) {
    sideDetailsList.push({ label: t('label.registrationNum'), value: registration.registration_number })
    sideDetailsList.push({
      label: t('label.registrationDate'),
      value: dateToStringPacific(registration.startDate, 'MMMM Do, YYYY')
    })
  } else if (application) {
    sideDetailsList.push({ label: t('label.applicationNum'), value: application.applicationNumber })
    sideDetailsList.push({
      label: t('label.applicationDate'),
      value: dateToStringPacific(application.applicationDateTime, 'MMMM Do, YYYY')
    })
  }
  if (business.businessNumber) {
    sideDetailsList.push({ label: t('label.busNum'), value: business.businessNumber })
  }

  sideDetails.value = sideDetailsList
}

export const getDashboardAddresses = (business: StrrBusiness) => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n

  const addresses: ConnectAccordionItem[] = [{
    defaultOpen: true,
    showAvatar: false,
    label: t('label.mailingAddress'),
    values: [
      {
        icon: 'i-mdi-email-outline',
        address: business.mailingAddress
      }
    ]
  }]
  if (business.hasRegOffAtt) {
    addresses.push({
      showAvatar: false,
      label: t('strr.label.registeredOfficeAttorney'),
      values: [
        {
          class: 'pl-7',
          label: t('strr.label.attName'),
          text: business.regOfficeOrAtt.attorneyName ?? t('label.notAvailable')
        },
        {
          class: 'pl-7',
          label: t('label.registeredOffice'),
          address: business.regOfficeOrAtt.mailingAddress
        }
      ]
    })
  }
  return addresses
}

export const getRepItem = (rep: StrrContact): ConnectAccordionItem => {
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
  const { primaryRep, secondaryRep } = useStrrContactStore()
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
