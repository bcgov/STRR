export const useRenewals = () => {
  const isEligibleForRenewal = ref(false)

  const { registration } = storeToRefs(useStrrStrataStore())

  watch(registration, () => {
    if (!registration.value) {
      isEligibleForRenewal.value = false
    }

    // TODO: get renewals from Strata ToDo when ready, for now just check the status
    isEligibleForRenewal.value = registration.value?.status === RegistrationStatus.EXPIRED
  })

  return {
    isEligibleForRenewal
  }
}
