import { CanadaPostAddressResponseDataLevelE } from '~/enums/address-datalevel-e'

export interface CanadaPostAddressI {
  street: string
  streetAdditional?: string
  city: string
  region: string
  postalCode: string
  country: string
  deliveryInstructions?: string
}

export interface CanadaPostAddressWithStreetAttributesI {
  streetNumber: string
  streetName: string
  unitNumber?: string
  streetAdditional?: string
  city: string
  region: string
  postalCode: string
  country: string
  deliveryInstructions?: string
}

export interface CanadaPostResponseAddressI {
  Id: string
  DomesticId: string
  Language: string
  LanguageAlternatives: string
  Department: string
  Company: string
  SubBuilding: string
  BuildingNumber: string
  BuildingName: string
  SecondaryStreet: string
  Street: string
  Block: string
  Neighbourhood: string
  District: string
  City: string
  Line1: string
  Line2: string
  Line3: string
  Line4: string
  Line5: string
  AdminAreaName: string
  AdminAreaCode: string
  Province: string
  ProvinceName: string
  ProvinceCode: string
  PostalCode: string
  CountryName: string
  CountryIso2: string
  CountryIso3: string
  CountryIsoNumber: number
  SortingNumber1: string
  SortingNumber2: string
  Barcode: string
  POBoxNumber: string
  Label: string
  DataLevel: CanadaPostAddressResponseDataLevelE
}

export interface CountryItem {
  value: string;
  name: string;
}

export interface ProvinceItem {
  value: string;
  name: string;
}
