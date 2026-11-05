import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive } from 'vue'
import { useExaminerDecision } from '~/composables/useExaminerDecision'
import { ApplicationActionsE, RegistrationActionsE } from '#imports'

const mockConditions = ref<string[]>([])
const mockCustomConditions = ref<string[] | null>(null)
const mockMinBookingDays = ref<number | null>(null)
const mockDecisionEmailContent = ref({ content: '' })
const mockDecisionEmailFormRef = ref({ clear: vi.fn() })
const mockHasRegistrationNumber = ref(false)
const mockIsApplication = ref(true)

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => reactive({
    conditions: mockConditions,
    customConditions: mockCustomConditions,
    minBookingDays: mockMinBookingDays,
    decisionEmailContent: mockDecisionEmailContent,
    decisionEmailFormRef: mockDecisionEmailFormRef,
    hasRegistrationNumber: mockHasRegistrationNumber,
    isApplication: mockIsApplication
  })
}))

vi.mock('@/composables/useExaminerFeatureFlags', () => ({
  useExaminerFeatureFlags: () => ({
    isExaminerDecisionsEnabled: ref(true)
  })
}))

describe('useExaminerDecision Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { resetDecision } = useExaminerDecision()
    resetDecision()
    mockConditions.value = []
    mockCustomConditions.value = null
    mockMinBookingDays.value = null
    mockDecisionEmailContent.value = { content: '' }
  })

  it('initializes with null decisionIntent and false hasOpenConditionForm', () => {
    const { decisionIntent, hasOpenConditionForm, isMainActionDisabled } = useExaminerDecision()

    expect(decisionIntent.value).toBeNull()
    expect(hasOpenConditionForm.value).toBe(false)
    expect(isMainActionDisabled.value).toBe(false)
  })

  describe('isMainActionDisabled computed state', () => {
    it('is false when APPROVE is selected but no condition form is open', () => {
      const { selectDecisionIntent, isMainActionDisabled } = useExaminerDecision()
      selectDecisionIntent(ApplicationActionsE.APPROVE)

      expect(isMainActionDisabled.value).toBe(false)
    })

    it('is true when APPROVE is selected and hasOpenConditionForm is true', () => {
      const { selectDecisionIntent, hasOpenConditionForm, isMainActionDisabled } = useExaminerDecision()
      selectDecisionIntent(ApplicationActionsE.APPROVE)
      hasOpenConditionForm.value = true

      expect(isMainActionDisabled.value).toBe(true)
    })

    it('is true when Registration APPROVE is selected and hasOpenConditionForm is true', () => {
      const { selectDecisionIntent, hasOpenConditionForm, isMainActionDisabled } = useExaminerDecision()
      selectDecisionIntent(RegistrationActionsE.APPROVE)
      hasOpenConditionForm.value = true

      expect(isMainActionDisabled.value).toBe(true)
    })

    it('is false when SEND_NOC is selected even if hasOpenConditionForm is true', () => {
      const { selectDecisionIntent, hasOpenConditionForm, isMainActionDisabled } = useExaminerDecision()
      selectDecisionIntent(ApplicationActionsE.SEND_NOC)
      hasOpenConditionForm.value = true

      // Non-approve actions must never be disabled by condition draft forms
      expect(isMainActionDisabled.value).toBe(false)
    })

    it('is false for REJECT or CANCEL even if hasOpenConditionForm is true', () => {
      const { selectDecisionIntent, hasOpenConditionForm, isMainActionDisabled } = useExaminerDecision()

      selectDecisionIntent(ApplicationActionsE.REJECT)
      hasOpenConditionForm.value = true
      expect(isMainActionDisabled.value).toBe(false)

      selectDecisionIntent(RegistrationActionsE.CANCEL)
      hasOpenConditionForm.value = true
      expect(isMainActionDisabled.value).toBe(false)
    })
  })

  describe('selectDecisionIntent transitions', () => {
    it('sets decisionIntent and clears draft condition state when switching actions', () => {
      const { selectDecisionIntent, decisionIntent, hasOpenConditionForm, isMainActionDisabled } = useExaminerDecision()

      // Start with APPROVE and an open condition form
      selectDecisionIntent(ApplicationActionsE.APPROVE)
      hasOpenConditionForm.value = true
      mockConditions.value = ['principalResidence']
      mockMinBookingDays.value = 14
      mockDecisionEmailContent.value.content = 'Approval text'

      expect(isMainActionDisabled.value).toBe(true)

      // Switch to SEND_NOC
      selectDecisionIntent(ApplicationActionsE.SEND_NOC)

      expect(decisionIntent.value).toBe(ApplicationActionsE.SEND_NOC)
      expect(hasOpenConditionForm.value).toBe(false)
      expect(isMainActionDisabled.value).toBe(false)
      expect(mockConditions.value).toEqual([])
      expect(mockMinBookingDays.value).toBeNull()
      expect(mockDecisionEmailContent.value.content).toBe('')
      expect(mockDecisionEmailFormRef.value.clear).toHaveBeenCalled()
    })

    it('does not reset state when re-selecting the current action', () => {
      const { selectDecisionIntent } = useExaminerDecision()

      selectDecisionIntent(ApplicationActionsE.APPROVE)
      mockDecisionEmailFormRef.value.clear.mockClear()
      mockConditions.value = ['principalResidence']

      // Selecting the same action should be a no-op
      selectDecisionIntent(ApplicationActionsE.APPROVE)

      expect(mockConditions.value).toEqual(['principalResidence'])
      expect(mockDecisionEmailFormRef.value.clear).not.toHaveBeenCalled()
    })
  })

  describe('resetDecision', () => {
    it('clears all decision state including decisionIntent', () => {
      const { selectDecisionIntent, resetDecision, decisionIntent, hasOpenConditionForm } = useExaminerDecision()

      selectDecisionIntent(ApplicationActionsE.APPROVE)
      hasOpenConditionForm.value = true
      mockConditions.value = ['validBL']
      mockMinBookingDays.value = 30

      resetDecision()

      expect(decisionIntent.value).toBeNull()
      expect(hasOpenConditionForm.value).toBe(false)
      expect(mockConditions.value).toEqual([])
      expect(mockMinBookingDays.value).toBeNull()
    })
  })
})
