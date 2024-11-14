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

export const getPropertyTypeDisplay = (type: string | undefined, t: (key: string) => string): string => {
  const propertyKey = type ? propertyTypeMap[type as keyof PropertyTypeMapI] : undefined
  return propertyKey ? t(propertyKey) : type ?? '-'
}
