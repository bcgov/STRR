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
    { label: t('strr.label.cpbcNum'), value: platformBusiness.cpbcLicenceNumber ?? t('text.notEntered') },
    {
      label: t('strr.label.noncomplianceEmail'),
      value: platformBusiness.nonComplianceEmail
    },
    { label: t('strr.label.takedownEmail'), value: platformBusiness.takeDownEmail }
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
