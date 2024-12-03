export const setHostSideHeaderDetails = () => {
  // set right side details of header
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { sideDetails } = storeToRefs(useConnectDetailsHeaderStore())
  const { unitDetails, blInfo } = useHostPropertyStore()

  if (unitDetails.parcelIdentifier) {
    sideDetails.value.push({
      label: t('strr.label.unitDetails.parcelIdentifier'),
      value: unitDetails.parcelIdentifier
    })
  }
  if (blInfo.businessLicense) {
    sideDetails.value.push({
      label: t('strr.label.businessLicense'),
      value: blInfo.businessLicense
    })
  }
  if (blInfo.businessLicenseExpiryDate) {
    sideDetails.value.push({
      label: t('strr.label.businessLicenseDate'),
      value: dateToStringPacific(blInfo.businessLicenseExpiryDate, 'DDD')
    })
  }
}

export const getHostPermitDashOwners = (): ConnectAccordionItem[] => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { hostOwners } = useHostOwnerStore()
  const dashOwners: ConnectAccordionItem[] = []
  for (const owner of hostOwners) {
    // set common accordian things
    const baseInfo = getPartyItem(owner)
    // add preferred name
    if (owner.preferredName) {
      baseInfo.values.splice(0, 0, {
        icon: 'i-mdi-account-star', iconClass: 'size-5', text: owner.preferredName
      })
    }
    if (owner.ownerType === OwnerType.BUSINESS) {
      // set label to business name + add contact name listing, etc.
      baseInfo.values.splice(0, 0, {
        icon: 'i-mdi-account', iconClass: 'size-5', text: baseInfo.label
      })
      baseInfo.label = owner.businessLegalName
      baseInfo.values.splice(0, 0, {
        icon: 'i-mdi-email', iconClass: 'size-5', address: owner.mailingAddress
      })
      if (owner.businessNumber) {
        baseInfo.values.splice(0, 0, {
          icon: 'i-mdi-pound', iconClass: 'size-5 mt-[2px]', text: owner.businessNumber
        })
      }
    } else {
      baseInfo.values.push({
        icon: 'i-mdi-home-account', iconClass: 'size-5', address: owner.mailingAddress
      })
      // add business info to listing if it exists
      if (owner.businessLegalName) {
        baseInfo.values.push({
          icon: 'i-mdi-domain', iconClass: 'size-5 mt-[2px]', text: owner.businessLegalName
        })
      }
      if (owner.businessNumber) {
        baseInfo.values.push({
          icon: 'i-mdi-pound', iconClass: 'size-5 mt-[2px]', text: owner.businessNumber
        })
      }
    }
    // set role at the top
    baseInfo.values.splice(0, 0, { text: t(`strr.label.role.${owner.role}`) })
    dashOwners.push(baseInfo)
  }
  if (dashOwners.length && dashOwners[0]) {
    dashOwners[0].defaultOpen = true
  }
  return dashOwners
}
