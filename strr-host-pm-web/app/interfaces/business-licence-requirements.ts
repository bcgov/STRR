import type { BlExemptionReason } from '~/enums/bl-exemption-reason'

export interface BusinessLicenceRequirements {
  isBusinessLicenceExempt: boolean
  blExemptType: BlExemptionReason | undefined
  blExemptReason: string
}
