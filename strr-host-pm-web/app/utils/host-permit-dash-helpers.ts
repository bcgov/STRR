export const getHostPermitDashOwners = (): ConnectAccordionItem[] => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { hostOwners } = useHostOwnerStore()
  const dashOwners: ConnectAccordionItem[] = []
  for (const owner of hostOwners) {
    // set common accordian things
    const baseInfo = getPartyItem(owner)
    if (owner.ownerType === OwnerType.INDIVIDUAL) {
      // set individual things
      baseInfo.iconAvatar = 'i-mdi-account'
      baseInfo.values.splice(0, 0, ...[
        ...(owner.preferredName
          ? [{ label: t('label.preferredName'), text: owner.preferredName }]
          : []
        ),
        ...(owner.dateOfBirth
          ? [{ label: t('label.birthdate'), text: owner.dateOfBirth }]
          : []
        ),
        ...(owner.taxNumber
          ? [{ label: t('label.craTaxNumber'), text: owner.taxNumber }]
          : [{ label: t('label.craTaxNumber'), text: t('label.noCraTaxNumber') }]
        ),
        {
          icon: owner.role === OwnerRole.HOST ? 'i-mdi-map-marker-outline' : 'i-mdi-email-outline',
          iconClass: 'size-5',
          address: owner.mailingAddress
        }
      ])
    } else { // owner.ownerType === OwnerType.BUSINESS
      // set business things
      baseInfo.iconAvatar = 'i-mdi-domain'
      baseInfo.values.splice(0, 0, ...[
        ...(owner.businessNumber
          ? [{ label: t('label.busNum'), text: owner.businessNumber }]
          : []
        ),
        {
          icon: 'i-mdi-email-outline',
          iconClass: 'size-5',
          address: owner.mailingAddress
        },
        { text: baseInfo.label, label: t('strr.label.contactIndName') },
        ...(owner.preferredName
          ? [{ label: t('label.preferredName'), text: owner.preferredName }]
          : []
        )
      ])
      baseInfo.label = owner.businessLegalName
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
