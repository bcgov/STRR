import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { computed, ref, reactive, toRef } from 'vue'
import { enI18n } from '../mocks/i18n'
import DecisionPanel from '~/components/DecisionPanel.vue'
import { ApplicationActionsE, RegistrationStatus } from '#imports'

const decisionIntent = ref<ApplicationActionsE | null>(null)
const isApplication = ref(true)
const isAssignedToUser = ref(true)
const activeHeader = ref({
  examinerActions: [ApplicationActionsE.APPROVE],
  isSetAside: false,
  assignee: { username: 'examiner1' }
})
const activeReg = ref<any>({
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
    showDecisionPanel: computed(() =>
      !isApplication.value ||
      !activeHeader.value.registrationNumber ||
      activeHeader.value.examinerActions.includes(ApplicationActionsE.PROVISIONAL_APPROVE)
    ),
    decisionIntent,
    preDefinedConditions: ['principalResidence', 'validBL'],
    resetDecision: vi.fn(),
    isDecisionEmailValid: vi.fn().mockResolvedValue(true)
  })
}))

describe('DecisionPanel', () => {
  beforeEach(() => {
    decisionIntent.value = null
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

  it('should load existing application conditions when approve is selected without edits', async () => {
    decisionIntent.value = null
    activeReg.value = {
      status: RegistrationStatus.ACTIVE,
      conditionsOfApproval: {
        predefinedConditions: ['principalResidence'],
        customConditions: ['Keep records available'],
        minBookingDays: 14
      }
    } as any

    const wrapper = await mountSuspended(DecisionPanel, {
      global: { plugins: [enI18n] }
    })

    await wrapper.find('[data-testid="decision-button-approve"]').trigger('click')

    expect(wrapper.find('[data-testid="approval-conditions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="approval-conditions"]').text()).toContain('Principal Residence')
    expect(wrapper.find('[data-testid="approval-conditions"]').text()).toContain('Custom Cond.')
    expect(minBookingDays.value).toBe(14)
  })

  it('should show the decision panel for provisional application approval', async () => {
    isApplication.value = true
    activeHeader.value = {
      examinerActions: [ApplicationActionsE.PROVISIONAL_APPROVE],
      isSetAside: false,
      assignee: { username: 'examiner1' }
    }
    decisionIntent.value = ApplicationActionsE.APPROVE

    const wrapper = await mountSuspended(DecisionPanel, {
      global: { plugins: [enI18n] }
    })

    expect(wrapper.find('[data-testid="decision-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="approval-conditions"]').exists()).toBe(true)
  })

  it('should hide the decision panel for a registered application without provisional approval', async () => {
    activeHeader.value = {
      examinerActions: [ApplicationActionsE.APPROVE],
      registrationNumber: 'REG-123',
      isSetAside: false,
      assignee: { username: 'examiner1' }
    }

    const wrapper = await mountSuspended(DecisionPanel, {
      global: { plugins: [enI18n] }
    })

    expect(wrapper.find('[data-testid="decision-panel"]').exists()).toBe(false)
  })
})
