export const getOwnershipTypeDisplay = (ownershipType: string | null, t: (key: string) => string) => {
  switch (ownershipType) {
    case 'CO_OWN':
      return t('coOwner')
    case 'OWN':
      return t('owner')
    case 'RENT':
      return t('rent')
    default:
      return ownershipType ?? '-'
  }
}
