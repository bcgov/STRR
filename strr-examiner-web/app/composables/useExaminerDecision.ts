// wip: selected action to track the examiner's current intent
const decisionIntent = ref<ApplicationActionsE | RegistrationActionsE | null>(null)

export const useExaminerDecision = () => {
  decisionIntent.value = null // reset decision when data/page is refreshed

  const { isFeatureEnabled } = useFeatureFlags()

  // TODO: list of status when to show Decision panel for Applications
  // const decisionRequiredStatuses = [
  //   ApplicationStatus.FULL_REVIEW,
  //   ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED,
  //   ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
  //   ApplicationStatus.NOC_PENDING,
  //   ApplicationStatus.NOC_EXPIRED
  // ]

  const { isApplication } = storeToRefs(useExaminerStore())

  const showDecisionPanel = computed((): boolean => {
    return isFeatureEnabled('enable-examiner-decisions').value && !isApplication.value
  })

  return {
    showDecisionPanel,
    decisionIntent
  }
}
