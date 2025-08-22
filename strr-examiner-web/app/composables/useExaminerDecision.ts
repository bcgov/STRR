// selected action to track the examiner's current intent
const decisionIntent = ref<ApplicationActionsE | RegistrationActionsE | null>(null)
const isMainActionDisabled = ref(false)

// list of defined conditions that examiner can select from the list
const preDefinedConditions: string[] = [
  'principalResidence',
  'validBL',
  'class9FarmLand',
  'partOfStrataHotel',
  'fractionalOwnership'
]

export const useExaminerDecision = () => {
  const { isFeatureEnabled } = useFeatureFlags()

  const {
    conditions,
    customConditions,
    minBookingDays,
    decisionEmailContent
  } = storeToRefs(useExaminerStore())

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

  const resetDecision = (): void => {
    decisionIntent.value = null
    decisionEmailContent.value = ''
    conditions.value = []
    customConditions.value = null
    minBookingDays.value = null
  }

  return {
    showDecisionPanel,
    decisionIntent,
    preDefinedConditions,
    isMainActionDisabled,
    resetDecision
  }
}
