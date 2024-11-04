export const getOwnershipTypeDisplay = (ownershipType: string | undefined, t: (key: string) => string) => {
  switch (ownershipType) {
    case 'CO_OWN':
      return t('coOwn')
    case 'OWN':
      return t('owner')
    case 'RENT':
      return t('rent')
    default:
      return ownershipType ?? '-'
  }
}
