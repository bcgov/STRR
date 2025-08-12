// wip: selected action to track the examiner's current intent
const decisionIntent = ref<ApplicationActionsE | RegistrationActionsE | null>(null)

export const useExaminerDecision = () => {
  decisionIntent.value = null // reset decision when data/page is refreshed

  const { isFeatureEnabled } = useFeatureFlags()

  // list of status when to show Decision panel
  const decisionRequiredStatuses = [
    ApplicationStatus.FULL_REVIEW,
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED,
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
    ApplicationStatus.NOC_PENDING,
    ApplicationStatus.NOC_EXPIRED
  ]

  const { isApplication, activeHeader } = storeToRefs(useExaminerStore())

  const showDecisionPanel = computed((): boolean => {
    return isFeatureEnabled('enable-examiner-decisions').value &&
      (decisionRequiredStatuses.includes(activeHeader.value?.status) || !isApplication.value)
  })

  return {
    showDecisionPanel,
    decisionIntent
  }
}
