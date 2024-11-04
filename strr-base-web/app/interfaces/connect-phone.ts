export interface ConnectPhone {
  countryIso2?: string
  countryCode?: string
  number: string
  extension?: string
}

export interface ConnectPhoneCountry {
  callingCode: string,
  iso2?: string,
  label?: string,
  nameLocal?: string,
  nameEn?: string
}
