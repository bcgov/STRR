export const getDashboardBuildings = () => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n

  const { strataDetails } = useStrrStrataDetailsStore()

  const buildings: ConnectAccordionItem[] = [{
    defaultOpen: true,
    showAvatar: false,
    label: t('strr.label.building', 2),
    values: [
      {
        icon: 'i-mdi-home-outline',
        address: strataDetails.location
      }
    ]
  }]

  for (let i = 0; i < strataDetails.buildings.length; i++) {
    buildings.push({
      defaultOpen: false,
      showAvatar: false,
      label: `${t('strr.label.building', 0)} ${i + 2}`,
      values: [
        {
          icon: 'i-mdi-home-outline',
          address: strataDetails.buildings[i]
        }
      ]
    })
  }
  return buildings
}
