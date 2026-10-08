export type HostContactType = 'primaryContact' | 'secondaryContact' | 'propertyManager'

export const HOST_CONTACT_EMAIL_I18N_KEYS: Record<
  HostContactType,
  { title: string, description: string }
> = {
  primaryContact: {
    title: 'strr.label.editHostEmail',
    description: 'strr.label.editHostEmailDescription'
  },
  secondaryContact: {
    title: 'strr.label.editSecondaryContactEmail',
    description: 'strr.label.editSecondaryContactEmailDescription'
  },
  propertyManager: {
    title: 'strr.label.editPropertyManagerEmail',
    description: 'strr.label.editPropertyManagerEmailDescription'
  }
}

const isBusinessPropertyManager = (reg?: HostRegistrationResp): boolean =>
  reg?.propertyManager?.propertyManagerType === OwnerType.BUSINESS

export function getHostContactEmail (
  reg: HostRegistrationResp | undefined,
  contactType: HostContactType
): string {
  if (contactType === 'secondaryContact') {
    return reg?.secondaryContact?.emailAddress || ''
  }
  if (contactType === 'propertyManager') {
    const pm = reg?.propertyManager
    return isBusinessPropertyManager(reg)
      ? pm?.business?.primaryContact?.emailAddress || ''
      : pm?.contact?.emailAddress || pm?.business?.primaryContact?.emailAddress || ''
  }
  return reg?.primaryContact?.emailAddress || ''
}

export function buildHostContactEmailPatchPayload (
  contactType: HostContactType,
  emailAddress: string,
  reg?: HostRegistrationResp
): Record<string, unknown> {
  if (contactType === 'secondaryContact') {
    return { secondaryContact: { emailAddress } }
  }
  if (contactType === 'propertyManager') {
    return isBusinessPropertyManager(reg)
      ? { propertyManager: { business: { primaryContact: { emailAddress } } } }
      : { propertyManager: { contact: { emailAddress } } }
  }
  return { primaryContact: { emailAddress } }
}
