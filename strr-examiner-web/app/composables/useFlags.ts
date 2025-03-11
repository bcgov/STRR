export const useFlags = () => {
  const exStore = useExaminerStore()
  const { activeReg, isApplication, activeHeader } = storeToRefs(exStore)
  const REGISTRATIONS_LIMIT = 2
  const existingHostRegistrations = isApplication.value
    ? activeHeader.value.existingHostRegistrations
    : undefined

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
      unitNumberRequired.includes(activeReg.value.unitDetails.propertyType) &&
      !activeReg.value.unitAddress?.unitNumber
    )
  })

  const isProhibited = computed(() => activeReg.value.strRequirements?.isStrProhibited)

  /**
   * @description Requirement: address in Principal Residence area without PR exemption,
   * when rental unit setup is "not on same property as host".
   */
  const isNotSameProperty = computed((): boolean => {
    const { isPrincipalResidenceRequired } = activeReg.value?.strRequirements as PropertyRequirements
    const { prExemptReason, hostResidence } = activeReg.value.unitDetails as ApiUnitDetails

    return isPrincipalResidenceRequired && !prExemptReason && hostResidence === ResidenceType.ANOTHER_UNIT
  })

  /**
   * @description Requirement: Host is a business
   */
  const isHostTypeBusiness = computed(
    (): boolean => activeReg.value.primaryContact?.contactType === OwnerType.BUSINESS
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
