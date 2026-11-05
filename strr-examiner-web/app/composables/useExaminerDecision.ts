// selected action to track the examiner's current intent
const decisionIntent = ref<ApplicationActionsE | RegistrationActionsE | null>(null)
const hasOpenConditionForm = ref(false)

// Main action is disabled when APPROVE is selected AND an inline condition form is open
const isMainActionDisabled = computed(() => {
  const isApprove =
    decisionIntent.value === ApplicationActionsE.APPROVE ||
    decisionIntent.value === RegistrationActionsE.APPROVE
  return isApprove && hasOpenConditionForm.value
})

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
    conditions,
    customConditions,
    minBookingDays,
    decisionEmailContent,
    decisionEmailFormRef
  } = storeToRefs(useExaminerStore())

  const showDecisionPanel = computed(() =>
    isExaminerDecisionsEnabled.value && (!isApplication.value || !hasRegistrationNumber.value)
  )

  // validate decision email for completing party
  const isDecisionEmailValid = async (): Promise<boolean> => {
    return await validateForm(decisionEmailFormRef.value, true).then(errors => !errors)
  }

  const clearDecisionState = (): void => {
    decisionEmailContent.value.content = ''
    decisionEmailFormRef?.value?.clear?.()
    conditions.value = []
    customConditions.value = null
    minBookingDays.value = null
    hasOpenConditionForm.value = false
  }

  const resetDecision = (): void => {
    decisionIntent.value = null
    clearDecisionState()
  }

  const selectDecisionIntent = (action: ApplicationActionsE | RegistrationActionsE): void => {
    if (decisionIntent.value === action) { return }
    clearDecisionState()
    decisionIntent.value = action
  }

  return {
    showDecisionPanel,
    decisionIntent,
    preDefinedConditions,
    hasOpenConditionForm,
    isMainActionDisabled,
    isDecisionEmailValid,
    selectDecisionIntent,
    resetDecision
  }
}
