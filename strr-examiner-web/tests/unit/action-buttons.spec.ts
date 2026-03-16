import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { enI18n } from '../mocks/i18n'
import ActionButtons from '~/components/ActionButtons.vue'
import { ApplicationActionsE, RegistrationActionsE, RegistrationStatus } from '#imports'

const mockAssignRegistration = vi.fn().mockResolvedValue(undefined)
const mockUnassignRegistration = vi.fn().mockResolvedValue(undefined)
const mockSetAsideRegistration = vi.fn().mockResolvedValue(undefined)
const mockUpdateRegistrationStatus = vi.fn().mockResolvedValue(undefined)
const mockSendNotice = vi.fn().mockResolvedValue(undefined)
const mockOpenConfirmActionModal = vi.fn()

const activeHeader = ref<any>({ examinerActions: [], isSetAside: false, assignee: { username: '' } })
const activeReg = ref<any>({ id: 'reg-123', status: RegistrationStatus.ACTIVE, conditionsOfApproval: null })
const isAssignedToUser = ref(true)
const decisionIntent = ref<ApplicationActionsE | RegistrationActionsE | null>(null)
const conditions = ref([])
const customConditions = ref(null)
const minBookingDays = ref<number | null>(null)
const decisionEmailContent = ref({ content: '' })

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => reactive({
    assignRegistration: mockAssignRegistration,
    unassignRegistration: mockUnassignRegistration,
    setAsideRegistration: mockSetAsideRegistration,
    updateRegistrationStatus: mockUpdateRegistrationStatus,
    sendNoticeOfConsiderationForRegistration: mockSendNotice,
    isAssignedToUser,
    activeHeader,
    activeReg,
    conditions,
    customConditions,
    minBookingDays,
    decisionEmailContent
  })
}))

vi.mock('@/composables/useExaminerDecision', () => ({
  useExaminerDecision: () => ({
    decisionIntent,
    isMainActionDisabled: ref(false),
    isDecisionEmailValid: vi.fn().mockResolvedValue(true)
  })
}))

mockNuxtImport('useStrrModals', () => () => ({
  openConfirmActionModal: mockOpenConfirmActionModal,
  close: vi.fn()
}))

vi.mock('nuxt/app', () => ({
  refreshNuxtData: vi.fn()
}))

const mount = () => mountSuspended(ActionButtons, { global: { plugins: [enI18n] } })

const clickMainButton = (wrapper: any) =>
  wrapper.find('[data-testid="main-action-button"]').trigger('click')

// Get confirmHandler action, from openConfirmActionModal (confirmHandler is at position 3)
const getConfirmCallback = () => mockOpenConfirmActionModal.mock.lastCall!.at(3) as () => void

describe('ActionButtons Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeHeader.value = { examinerActions: [], isSetAside: false, assignee: { username: '' } }
    activeReg.value = { id: 'reg-123', status: RegistrationStatus.ACTIVE, conditionsOfApproval: null }
    isAssignedToUser.value = true
    decisionIntent.value = null
    conditions.value = []
    customConditions.value = null
    minBookingDays.value = null
    decisionEmailContent.value = { content: '' }
  })

  it('should show assign button when no assignee, and unassign button when assignee exists', async () => {
    const wrapper = await mount()

    expect(wrapper.find('[data-testid="action-button-assign"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="action-button-unassign"]').exists()).toBe(false)

    activeHeader.value = { ...activeHeader.value, assignee: { username: 'examiner1' } }
    await flushPromises()

    expect(wrapper.find('[data-testid="action-button-assign"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="action-button-unassign"]').exists()).toBe(true)
  })

  it('should correctly show set-aside button', async () => {
    const wrapper = await mount()

    expect(wrapper.find('[data-testid="action-button-set-aside"]').exists()).toBe(false)

    activeHeader.value = { ...activeHeader.value, examinerActions: [ApplicationActionsE.SET_ASIDE] }
    await flushPromises()

    expect(wrapper.find('[data-testid="action-button-set-aside"]').exists()).toBe(true)
  })

  it('should show main action button when assigned and a decision intent is selected', async () => {
    const wrapper = await mount()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(false)

    decisionIntent.value = ApplicationActionsE.REJECT
    await flushPromises()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(true)
  })

  it('should show main Approve action button only when conditions have changed', async () => {
    activeReg.value = {
      ...activeReg.value,
      conditionsOfApproval: { predefinedConditions: [], customConditions: null, minBookingDays: null }
    }
    decisionIntent.value = ApplicationActionsE.APPROVE

    const wrapper = await mount()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(false)

    conditions.value = [{ condition: 'some-condition' }] as any
    await flushPromises()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(true)
  })

  it('should show main Approve action button when minBookingDays is updated', async () => {
    activeReg.value = {
      ...activeReg.value,
      conditionsOfApproval: { predefinedConditions: [], customConditions: null, minBookingDays: 5 }
    }
    decisionIntent.value = ApplicationActionsE.APPROVE
    minBookingDays.value = 5

    const wrapper = await mount()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(false)

    minBookingDays.value = 10
    await flushPromises()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(true)
  })

  it('should show main action button when registration is set aside, ignoring condition changes', async () => {
    // isSetAside bypasses the condition-change check
    activeHeader.value = { ...activeHeader.value, isSetAside: true }
    activeReg.value = {
      ...activeReg.value,
      conditionsOfApproval: { predefinedConditions: [], customConditions: null, minBookingDays: null }
    }
    decisionIntent.value = ApplicationActionsE.APPROVE

    const wrapper = await mount()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(true)
  })

  it('should call assignRegistration with the registration id when assign button is clicked', async () => {
    const wrapper = await mount()

    await wrapper.find('[data-testid="action-button-assign"]').trigger('click')
    await flushPromises()

    expect(mockAssignRegistration).toHaveBeenCalledOnce()
    expect(mockAssignRegistration).toHaveBeenCalledWith(activeReg.value.id)
  })

  it('should call setAsideRegistration with the registration id when set-aside button is clicked', async () => {
    activeHeader.value = { ...activeHeader.value, examinerActions: [ApplicationActionsE.SET_ASIDE] }

    const wrapper = await mount()

    await wrapper.find('[data-testid="action-button-set-aside"]').trigger('click')
    await flushPromises()

    expect(mockSetAsideRegistration).toHaveBeenCalledOnce()
    expect(mockSetAsideRegistration).toHaveBeenCalledWith(activeReg.value.id)
  })

  it('should call unassignRegistration directly when the current user is the assignee', async () => {
    activeHeader.value = { ...activeHeader.value, assignee: { username: 'examiner1' } }

    const wrapper = await mount()

    await wrapper.find('[data-testid="action-button-unassign"]').trigger('click')
    await flushPromises()

    expect(mockUnassignRegistration).toHaveBeenCalledOnce()
    expect(mockUnassignRegistration).toHaveBeenCalledWith(activeReg.value.id)
    expect(mockOpenConfirmActionModal).not.toHaveBeenCalled()
  })

  it('should open confirm modal when unassign is clicked and the current user is not the assignee', async () => {
    isAssignedToUser.value = false
    activeHeader.value = { ...activeHeader.value, assignee: { username: 'another-examiner' } }

    const wrapper = await mount()

    await wrapper.find('[data-testid="action-button-unassign"]').trigger('click')
    await flushPromises()

    expect(mockOpenConfirmActionModal).toHaveBeenCalledOnce()
    expect(mockUnassignRegistration).not.toHaveBeenCalled()
  })

  it('should open confirm modal for APPROVE decision on an active registration', async () => {
    activeReg.value = {
      ...activeReg.value,
      status: RegistrationStatus.ACTIVE,
      conditionsOfApproval: { predefinedConditions: [], customConditions: null, minBookingDays: null }
    }
    decisionIntent.value = ApplicationActionsE.APPROVE
    conditions.value = [{ condition: 'some-condition' }] as any

    const wrapper = await mount()

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockOpenConfirmActionModal).toHaveBeenCalledOnce()
  })

  it('should update registration status with CANCELLED when cancel confirm is clicked', async () => {
    decisionIntent.value = RegistrationActionsE.CANCEL
    decisionEmailContent.value = { content: 'cancellation notice' }

    const wrapper = await mount()
    expect(wrapper.find('[data-testid="main-action-button"]').text()).toContain('Cancel')

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockOpenConfirmActionModal).toHaveBeenCalledOnce()

    getConfirmCallback()()
    await flushPromises()

    expect(mockUpdateRegistrationStatus).toHaveBeenCalledOnce()
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledWith(
      'reg-123',
      RegistrationStatus.CANCELLED,
      'cancellation notice'
    )
  })

  it('should update registration status with ACTIVE when approve confirm is clicked', async () => {
    activeReg.value = {
      ...activeReg.value,
      status: RegistrationStatus.CANCELLED,
      conditionsOfApproval: { predefinedConditions: [], customConditions: null, minBookingDays: null }
    }
    decisionIntent.value = ApplicationActionsE.APPROVE
    conditions.value = [{ condition: 'some-condition' }] as any
    decisionEmailContent.value = { content: 'approval email' }

    const wrapper = await mount()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(true)

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockOpenConfirmActionModal).toHaveBeenCalledWith(
      expect.stringContaining('Approve'),
      expect.any(String),
      expect.stringContaining('Approve'),
      expect.any(Function),
      expect.any(String)
    )

    getConfirmCallback()()
    await flushPromises()

    expect(mockUpdateRegistrationStatus).toHaveBeenCalledOnce()
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledWith(
      'reg-123',
      RegistrationStatus.ACTIVE,
      'approval email',
      { predefinedConditions: conditions.value }
    )
  })

  it('should send notice and clear content when send notice confirm is clicked', async () => {
    decisionIntent.value = ApplicationActionsE.SEND_NOC
    decisionEmailContent.value = { content: 'notice of consideration body' }

    const wrapper = await mount()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(true)

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockOpenConfirmActionModal).toHaveBeenCalledWith(
      expect.stringContaining('Notice'),
      expect.any(String),
      expect.stringContaining('Send'),
      expect.any(Function)
    )

    getConfirmCallback()()
    await flushPromises()

    expect(mockSendNotice).toHaveBeenCalledOnce()
    expect(mockSendNotice).toHaveBeenCalledWith('reg-123', 'notice of consideration body')
    expect(decisionEmailContent.value.content).toBe('')
  })
})
