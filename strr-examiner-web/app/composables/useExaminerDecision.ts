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
  const { isExaminerDecisionsEnabled } = useExaminerFeatureFlags()

  const {
    hasRegistrationNumber,
    isApplication,
    activeHeader,
    conditions,
    customConditions,
    minBookingDays,
    decisionEmailContent,
    decisionEmailFormRef
  } = storeToRefs(useExaminerStore())

  // TODO: list of status when to show Decision panel for Applications
  // const decisionRequiredStatuses = [
  //   ApplicationStatus.FULL_REVIEW,
  //   ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED,
  //   ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
  //   ApplicationStatus.NOC_PENDING,
  //   ApplicationStatus.NOC_EXPIRED
  // ]

  const showDecisionPanel = computed(() =>
    isExaminerDecisionsEnabled.value && (
      !isApplication.value ||
      !hasRegistrationNumber.value ||
      activeHeader.value?.examinerActions?.includes(ApplicationActionsE.PROVISIONAL_APPROVE)
    )
  )

  // validate decision email for completing party
  const isDecisionEmailValid = async (): Promise<boolean> => {
    return await validateForm(decisionEmailFormRef.value, true).then(errors => !errors)
  }

  const resetDecision = (): void => {
    decisionIntent.value = null
    decisionEmailContent.value.content = ''
    decisionEmailFormRef?.value?.clear()
    conditions.value = []
    customConditions.value = null
    minBookingDays.value = null
  }

  return {
    showDecisionPanel,
    decisionIntent,
    preDefinedConditions,
    isMainActionDisabled,
    isDecisionEmailValid,
    resetDecision
  }
}
