export const useExaminerDecision = () => {
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
    showDecisionPanel
  }
}
