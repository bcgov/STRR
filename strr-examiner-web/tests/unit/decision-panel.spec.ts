import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { ref, reactive, toRef } from 'vue'
import { enI18n } from '../mocks/i18n'
import DecisionPanel from '~/components/DecisionPanel.vue'
import { ApplicationActionsE, RegistrationStatus } from '#imports'

const decisionIntent = ref<ApplicationActionsE | null>(null)
const showDecisionPanel = ref(true)
const isApplication = ref(true)
const isAssignedToUser = ref(true)
const activeHeader = ref({
  examinerActions: [ApplicationActionsE.APPROVE],
  isSetAside: false,
  assignee: { username: 'examiner1' }
})
const activeReg = ref({
  status: RegistrationStatus.ACTIVE,
  conditionsOfApproval: { predefinedConditions: [], customConditions: null, minBookingDays: null }
})
const conditions = ref<string[]>([])
const customConditions = ref<string[] | null>(null)
const minBookingDays = ref<number | null>(null)
const decisionEmailContent = ref({ content: '' })
const decisionEmailFormRef = ref({ clear: vi.fn() })

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => reactive({
    isApplication,
    isAssignedToUser,
    activeReg,
    activeHeader,
    decisionEmailFormRef,
    sendNocSchema: {},
    conditions,
    customConditions,
    minBookingDays,
    decisionEmailContent
  }),
  storeToRefs: (store: any) => ({
    isApplication: toRef(store, 'isApplication'),
    isAssignedToUser: toRef(store, 'isAssignedToUser'),
    activeReg: toRef(store, 'activeReg'),
    activeHeader: toRef(store, 'activeHeader'),
    decisionEmailFormRef: toRef(store, 'decisionEmailFormRef'),
    sendNocSchema: toRef(store, 'sendNocSchema'),
    conditions: toRef(store, 'conditions'),
    customConditions: toRef(store, 'customConditions'),
    minBookingDays: toRef(store, 'minBookingDays'),
    decisionEmailContent: toRef(store, 'decisionEmailContent')
  })
}))

vi.mock('@/composables/useExaminerDecision', () => ({
  useExaminerDecision: () => ({
    showDecisionPanel,
    decisionIntent,
    preDefinedConditions: ['principalResidence', 'validBL'],
    resetDecision: vi.fn(),
    isDecisionEmailValid: vi.fn().mockResolvedValue(true)
  })
}))

describe('DecisionPanel', () => {
  beforeEach(() => {
    decisionIntent.value = null
    showDecisionPanel.value = true
    isApplication.value = true
    isAssignedToUser.value = true
    conditions.value = []
    customConditions.value = null
    minBookingDays.value = null
    decisionEmailContent.value = { content: '' }
  })

  it('should show approval conditions when approve is chosen on an application', async () => {
    decisionIntent.value = ApplicationActionsE.APPROVE

    const wrapper = await mountSuspended(DecisionPanel, {
      global: { plugins: [enI18n] }
    })

    expect(wrapper.find('[data-testid="approval-conditions"]').exists()).toBe(true)
  })

  it('should not show approval conditions when no decision is chosen', async () => {
    const wrapper = await mountSuspended(DecisionPanel, {
      global: { plugins: [enI18n] }
    })

    expect(wrapper.find('[data-testid="approval-conditions"]').exists()).toBe(false)
  })

  it('should not show approval conditions when the application is not assigned to the examiner', async () => {
    decisionIntent.value = ApplicationActionsE.APPROVE
    isAssignedToUser.value = false

    const wrapper = await mountSuspended(DecisionPanel, {
      global: { plugins: [enI18n] }
    })

    expect(wrapper.find('[data-testid="approval-conditions"]').exists()).toBe(false)
  })

  it('should disable the completion email field when approve is selected', async () => {
    decisionIntent.value = ApplicationActionsE.APPROVE

    const wrapper = await mountSuspended(DecisionPanel, {
      global: { plugins: [enI18n] }
    })

    expect(wrapper.find('[data-testid="decision-email"]').attributes('disabled')).toBeDefined()
  })
})
