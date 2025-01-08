export const getAddressDisplayParts = (
  address: Partial<ConnectAddress>,
  separateCity = false
): string[] => {
  const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

  return [
    `${address.street},` || [
      [address.unitNumber, address.streetNumber].filter(val => !!val).join('-'),
      `${address.streetName},`
    ].filter(val => !!val).join(' ') || '',
    address.streetAdditional ? `${address.streetAdditional},` : '',
    separateCity ? `${address.city},` || '' : '',
    [
      !separateCity
        ? `${address.city},`
        : '', `${address.region}\u00A0`, address.postalCode
    ].filter(val => !!val).join(' ') || '',
    address.country ? (regionNamesInEnglish.of(address.country) || address.country) : ''
  ].filter(val => !!val)
}
