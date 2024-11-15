export const setApplicationHeaderDetails = (receiptAction?: Function, hostStatus?: string) => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { details, bottomButtons } = storeToRefs(useConnectDetailsHeaderStore())

  if (hostStatus) {
    details.value = [{ text: hostStatus, chip: true, chipColour: 'yellow' }]
  }
  if (receiptAction) {
    bottomButtons.value = [
      {
        action: receiptAction,
        label: t('word.Receipt'),
        // TODO: find/replace with correct icon
        icon: 'i-mdi-file-download-outline'
      }
    ]
  }
}

export const setRegistrationHeaderDetails = (
  status: ApplicationStatus,
  expiryDate?: string,
  receiptAction?: Function
) => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { details, bottomButtons } = storeToRefs(useConnectDetailsHeaderStore())

  details.value = [{ text: status, chip: true }]
  if (expiryDate) {
    details.value.push({ text: `${t('label.expiryDate')} - ${expiryDate}` })
  }
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
    ...(receiptAction
      ? [{
          action: receiptAction,
          label: t('word.Receipt'),
          // TODO: find/replace with correct icon
          icon: 'i-mdi-file-download-outline'
        }]
      : [])
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
  if (business.hasRegOffAtt && business.regOfficeOrAtt.attorneyName) {
    addresses.push({
      showAvatar: false,
      label: t('strr.label.registeredOfficeAttorney'),
      values: [
        ...(business.regOfficeOrAtt.attorneyName
          ? [{
              icon: 'i-mdi-account-tie',
              label: t('strr.label.attName'),
              text: business.regOfficeOrAtt.attorneyName
            }]
          : []
        ),
        {
          icon: 'i-mdi-office-building',
          label: t('label.registeredOffice'),
          address: business.regOfficeOrAtt.mailingAddress
        }
      ]
    })
  }
  return addresses
}

export const getPartyItem = (party: Contact): ConnectAccordionItem => {
  const number = party.phone.countryCode === '1'
    ? party.phone.number.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    : party.phone.number
  return {
    showAvatar: true,
    label: `${party.firstName || ''} ` +
      `${party.middleName || ''} ` +
      `${party.lastName || ''}`.replaceAll('  ', '').trim(),
    values: [
      {
        icon: 'i-mdi-at',
        iconClass: 'text-base mt-[2px]',
        text: party.emailAddress
      },
      {
        icon: 'i-mdi-phone',
        iconClass: 'text-base mt-[2px]',
        text: `+${party.phone.countryCode} ${number}` +
          (party.phone.extension ? ` Ext. ${party.phone.extension}` : '')
      },
      ...(party.faxNumber
        ? [{
            icon: 'i-mdi-fax',
            iconClass: 'text-base mt-[2px]',
            text: party.faxNumber
          }]
        : [])
    ]
  }
}

export const getRepItem = (rep: StrrContact): ConnectAccordionItem => {
  const repItem = getPartyItem(rep)
  // add position info for representative
  repItem.values = [
    { text: rep?.position },
    ...repItem.values
  ]
  return repItem
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

export const getDashboardCompParty = (): ConnectAccordionItem | undefined => {
  const { completingParty } = useStrrContactStore()
  if (!completingParty) {
    return undefined
  }
  return getPartyItem(completingParty)
}
