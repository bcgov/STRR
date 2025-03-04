export const useFlags = (data: HostApplicationResp | HousRegistrationResponse, isApplication: boolean) => {
  const REGISTRATIONS_LIMIT = 2

  const registration = isApplication
    ? (data as HostApplicationResp).registration
    : data as HousRegistrationResponse
  const existingHostRegistrations = isApplication
    ? (data as HostApplicationResp).header.existingHostRegistrations
    : (data as HostRegistrationResp).existingHostRegistrations

  /**
   * @description Requirement: If Property Type is condo or apartment, multi-unit housing,
   * townhome, strata unit
   */
  const isUnitNumberMissing = computed((): boolean => {
    const unitNumberRequired = [
      PropertyType.CONDO_OR_APT,
      PropertyType.MULTI_UNIT_HOUSING,
      PropertyType.TOWN_HOME,
      PropertyType.STRATA_HOTEL
    ]
    return (
      unitNumberRequired.includes(registration.unitDetails.propertyType) &&
      !registration.unitAddress?.unitNumber
    )
  })

  const isProhibited = computed(() => registration.strRequirements?.isStrProhibited)

  /**
   * @description Requirement: address in Principal Residence area without PR exemption,
   * when rental unit setup is "not on same property as host".
   */
  const isNotSameProperty = computed((): boolean => {
    const { isPrincipalResidenceRequired } = registration?.strRequirements as PropertyRequirements
    const { prExemptReason, hostResidence } = registration.unitDetails as ApiUnitDetails

    return isPrincipalResidenceRequired && !prExemptReason && hostResidence === ResidenceType.ANOTHER_UNIT
  })

  /**
   * @description Requirement: Host is a business
   */
  const isHostTypeBusiness = computed(
    (): boolean => registration.primaryContact?.contactType === OwnerType.BUSINESS
  )

  /**
   * @description Requirement: Host exceeds registration limit
   */
  const isRegLimitExceeded = computed((): boolean => (existingHostRegistrations ?? 0) > REGISTRATIONS_LIMIT)

  return {
    isUnitNumberMissing,
    isNotSameProperty,
    isProhibited,
    isHostTypeBusiness,
    isRegLimitExceeded
  }
}
