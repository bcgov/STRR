import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { enI18n } from '../mocks/i18n'
import ActionButtons from '~/components/ActionButtons.vue'
import { ApplicationActionsE, RegistrationActionsE, RegistrationStatus } from '#imports'

const mockAssignRegistration = vi.fn().mockResolvedValue(undefined)
const mockAssignApplication = vi.fn().mockResolvedValue(undefined)
const mockUnassignApplication = vi.fn().mockResolvedValue(undefined)
const mockSetAsideApplication = vi.fn().mockResolvedValue(undefined)
const mockUnassignRegistration = vi.fn().mockResolvedValue(undefined)
const mockSetAsideRegistration = vi.fn().mockResolvedValue(undefined)
const mockUpdateRegistrationStatus = vi.fn().mockResolvedValue(undefined)
const mockSendNotice = vi.fn().mockResolvedValue(undefined)
const mockWithdrawApplication = vi.fn().mockResolvedValue(undefined)
const mockApproveApplication = vi.fn().mockResolvedValue(undefined)
const mockProvisionallyApproveApplication = vi.fn().mockResolvedValue(undefined)
const mockIsDecisionEmailValid = vi.fn().mockResolvedValue(true)
const mockOpenConfirmActionModal = vi.fn()
const mockOpenErrorModal = vi.fn()
const mockWithNoteCheck = vi.fn((action: () => void) => action())
const mockRefreshNuxtData = vi.hoisted(() => vi.fn())

const activeHeader = ref<any>({ examinerActions: [], isSetAside: false, assignee: { username: '' } })
const activeReg = ref<any>({ id: 'reg-123', status: RegistrationStatus.ACTIVE, conditionsOfApproval: null })
const isApplication = ref(false)
const isAssignedToUser = ref(true)
const decisionIntent = ref<ApplicationActionsE | RegistrationActionsE | null>(null)
const isMainActionDisabled = ref(false)
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
    withdrawApplication: mockWithdrawApplication,
    rejectApplication: vi.fn().mockResolvedValue(undefined),
    sendNoticeOfConsideration: vi.fn().mockResolvedValue(undefined),
    approveApplication: mockApproveApplication,
    provisionallyApproveApplication: mockProvisionallyApproveApplication,
    assignApplication: mockAssignApplication,
    unassignApplication: mockUnassignApplication,
    setAsideApplication: mockSetAsideApplication,
    isApplication,
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
    isMainActionDisabled,
    isDecisionEmailValid: mockIsDecisionEmailValid
  })
}))

mockNuxtImport('useStrrModals', () => () => ({
  openConfirmActionModal: mockOpenConfirmActionModal,
  openErrorModal: mockOpenErrorModal,
  close: vi.fn()
}))

vi.mock('nuxt/app', async importOriginal => ({
  ...await importOriginal<typeof import('nuxt/app')>(),
  refreshNuxtData: mockRefreshNuxtData
}))

// Note-guard logic is tested in use-examiner-notes.spec.ts; pending tests can defer its callback here.
vi.mock('@/composables/useExaminerNotes', () => ({
  useExaminerNotes: () => ({
    noteContent: ref(''),
    hasUnsavedNote: ref(false),
    withNoteCheck: mockWithNoteCheck,
    useNoteLeaveGuard: vi.fn()
  })
}))

const mount = () => mountSuspended(ActionButtons, { global: { plugins: [enI18n] } })

const clickMainButton = (wrapper: any) =>
  wrapper.find('[data-testid="main-action-button"]').trigger('click')

describe('ActionButtons Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeHeader.value = { examinerActions: [], isSetAside: false, assignee: { username: '' } }
    activeReg.value = { id: 'reg-123', status: RegistrationStatus.ACTIVE, conditionsOfApproval: null }
    isAssignedToUser.value = true
    isApplication.value = false
    decisionIntent.value = null
    isMainActionDisabled.value = false
    conditions.value = []
    customConditions.value = null
    minBookingDays.value = null
    decisionEmailContent.value = { content: '' }
    for (const mock of [
      mockAssignRegistration, mockAssignApplication, mockUnassignRegistration, mockUnassignApplication,
      mockSetAsideRegistration, mockSetAsideApplication, mockUpdateRegistrationStatus, mockApproveApplication,
      mockSendNotice, mockRefreshNuxtData
    ]) {
      mock.mockReset().mockResolvedValue(undefined)
    }
    mockIsDecisionEmailValid.mockReset().mockResolvedValue(true)
    mockWithNoteCheck.mockReset().mockImplementation(action => action())
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

  it('should label the application approval action as Approve Application', async () => {
    isApplication.value = true
    decisionIntent.value = ApplicationActionsE.APPROVE
    activeHeader.value = {
      ...activeHeader.value,
      assignee: { username: 'examiner1' },
      applicationNumber: 'APP-123'
    }

    const wrapper = await mount()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="main-action-button"]').text()).toContain('Approve Application')
  })

  it('should pass approval conditions when approving an application', async () => {
    isApplication.value = true
    activeHeader.value = {
      ...activeHeader.value,
      assignee: { username: 'examiner1' },
      applicationNumber: 'APP-123',
      examinerActions: [ApplicationActionsE.APPROVE]
    }
    decisionIntent.value = ApplicationActionsE.APPROVE
    conditions.value = ['principalResidence', 'minBookingDays']
    customConditions.value = ['Keep records available']
    minBookingDays.value = 14

    const wrapper = await mount()

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockApproveApplication).toHaveBeenCalledOnce()
    expect(mockApproveApplication).toHaveBeenCalledWith('APP-123', {
      predefinedConditions: ['principalResidence'],
      customConditions: ['Keep records available'],
      minBookingDays: 14
    })
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

  it('should update registration status with ACTIVE immediately when approve is clicked', async () => {
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

    expect(mockOpenConfirmActionModal).not.toHaveBeenCalled()
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledOnce()
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledWith(
      'reg-123',
      RegistrationStatus.ACTIVE,
      '',
      { predefinedConditions: conditions.value }
    )
    expect(mockRefreshNuxtData).toHaveBeenCalledWith('registration-details-view')
  })

  it('should update registration status with CANCELLED directly when cancel is clicked', async () => {
    decisionIntent.value = RegistrationActionsE.CANCEL
    decisionEmailContent.value = { content: 'cancellation notice' }

    const wrapper = await mount()
    expect(wrapper.find('[data-testid="main-action-button"]').text()).toContain('Cancel')

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockOpenConfirmActionModal).not.toHaveBeenCalled()
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledOnce()
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledWith(
      'reg-123',
      RegistrationStatus.CANCELLED,
      'cancellation notice'
    )
  })

  it('should update registration status with ACTIVE when approve is clicked', async () => {
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

    expect(mockOpenConfirmActionModal).not.toHaveBeenCalled()
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledOnce()
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledWith(
      'reg-123',
      RegistrationStatus.ACTIVE,
      'approval email',
      { predefinedConditions: conditions.value }
    )
  })

  it('should send notice and clear content directly when send notice is clicked', async () => {
    decisionIntent.value = ApplicationActionsE.SEND_NOC
    decisionEmailContent.value = { content: 'notice of consideration body' }

    const wrapper = await mount()

    expect(wrapper.find('[data-testid="main-action-button"]').exists()).toBe(true)

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockOpenConfirmActionModal).not.toHaveBeenCalled()
    expect(mockSendNotice).toHaveBeenCalledOnce()
    expect(mockSendNotice).toHaveBeenCalledWith('reg-123', 'notice of consideration body')
    expect(decisionEmailContent.value.content).toBe('')
    expect(mockRefreshNuxtData).toHaveBeenCalledWith('registration-details-view')
  })

  it('should withdraw an application without validating email content', async () => {
    isApplication.value = true
    activeHeader.value = {
      applicationNumber: 'APP-005',
      examinerActions: [ApplicationActionsE.WITHDRAW],
      isSetAside: false,
      assignee: { username: 'examiner1' }
    }
    decisionIntent.value = ApplicationActionsE.WITHDRAW

    const wrapper = await mount()

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockWithdrawApplication).toHaveBeenCalledWith('APP-005', false)
    expect(mockIsDecisionEmailValid).not.toHaveBeenCalled()
  })

  it.each([
    { name: 'application approval', app: true, button: 'main-action-button', mutation: mockApproveApplication },
    { name: 'registration approval', app: false, button: 'main-action-button', mutation: mockUpdateRegistrationStatus },
    { name: 'application assignment', app: true, button: 'action-button-assign', mutation: mockAssignApplication },
    { name: 'registration assignment', app: false, button: 'action-button-assign', mutation: mockAssignRegistration },
    {
      name: 'application unassignment',
      app: true,
      button: 'action-button-unassign',
      mutation: mockUnassignApplication
    },
    {
      name: 'registration unassignment',
      app: false,
      button: 'action-button-unassign',
      mutation: mockUnassignRegistration
    },
    { name: 'application set-aside', app: true, button: 'action-button-set-aside', mutation: mockSetAsideApplication },
    {
      name: 'registration set-aside',
      app: false,
      button: 'action-button-set-aside',
      mutation: mockSetAsideRegistration
    }
  ])('serializes $name through mutation and refresh', async ({ app, button, mutation }) => {
    isApplication.value = app
    activeHeader.value = {
      applicationNumber: 'APP-123',
      examinerActions: [ApplicationActionsE.SET_ASIDE],
      assignee: { username: button === 'action-button-assign' ? '' : 'examiner1' }
    }
    decisionIntent.value = ApplicationActionsE.APPROVE
    const request = Promise.withResolvers<void>()
    const reload = Promise.withResolvers<void>()
    mutation.mockReturnValueOnce(request.promise)
    mockRefreshNuxtData.mockReturnValueOnce(reload.promise)
    const wrapper = await mount()
    const selectedButton = wrapper.find<HTMLButtonElement>(`[data-testid="${button}"]`)

    // Two native clicks before Vue patches the disabled attribute exercise the request guard.
    selectedButton.element.click()
    selectedButton.element.click()
    await flushPromises()
    expect(mutation).toHaveBeenCalledOnce()
    expect(mockRefreshNuxtData).not.toHaveBeenCalled()
    expect(wrapper.findAll('button').every(item => item.element.disabled)).toBe(true)

    request.resolve()
    await flushPromises()
    expect(mockRefreshNuxtData).toHaveBeenCalledOnce()
    expect(mockRefreshNuxtData).toHaveBeenCalledWith(app ? 'application-details-view' : 'registration-details-view')
    expect(wrapper.findAll('button').every(item => item.element.disabled)).toBe(true)
    selectedButton.element.click()
    await flushPromises()
    expect(mutation).toHaveBeenCalledOnce()

    reload.resolve()
    await flushPromises()
    expect(selectedButton.element.disabled).toBe(false)
    expect(mockOpenErrorModal).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('keeps the main action disabled after pending assignment clears', async () => {
    decisionIntent.value = ApplicationActionsE.APPROVE
    isMainActionDisabled.value = true
    const request = Promise.withResolvers<void>()
    mockAssignRegistration.mockReturnValueOnce(request.promise)
    const wrapper = await mount()

    await wrapper.find('[data-testid="action-button-assign"]').trigger('click')
    await flushPromises()
    request.resolve()
    await flushPromises()

    expect(wrapper.find<HTMLButtonElement>('[data-testid="main-action-button"]').element.disabled).toBe(true)
    expect(wrapper.find<HTMLButtonElement>('[data-testid="action-button-assign"]').element.disabled).toBe(false)
    wrapper.unmount()
  })

  it('guards a deferred note-discard callback when it is invoked more than once', async () => {
    decisionIntent.value = RegistrationActionsE.CANCEL
    let confirmDiscard: (() => void) | undefined
    mockWithNoteCheck.mockImplementationOnce((action) => { confirmDiscard = action })
    const request = Promise.withResolvers<void>()
    mockUpdateRegistrationStatus.mockReturnValueOnce(request.promise)
    const wrapper = await mount()

    await clickMainButton(wrapper)
    expect(mockUpdateRegistrationStatus).not.toHaveBeenCalled()
    expect(confirmDiscard).toBeDefined()
    confirmDiscard!()
    confirmDiscard!()
    await flushPromises()

    expect(mockUpdateRegistrationStatus).toHaveBeenCalledOnce()
    request.resolve()
    await flushPromises()
    expect(wrapper.find<HTMLButtonElement>('[data-testid="main-action-button"]').element.disabled).toBe(false)
    wrapper.unmount()
  })

  it('guards confirmed unassignment and leaves controls free before confirmation', async () => {
    isAssignedToUser.value = false
    activeHeader.value = { ...activeHeader.value, assignee: { username: 'another-examiner' } }
    const request = Promise.withResolvers<void>()
    mockUnassignRegistration.mockReturnValueOnce(request.promise)
    const wrapper = await mount()

    await wrapper.find('[data-testid="action-button-unassign"]').trigger('click')
    expect(mockUnassignRegistration).not.toHaveBeenCalled()
    expect(wrapper.find<HTMLButtonElement>('[data-testid="action-button-unassign"]').element.disabled).toBe(false)
    const confirm = mockOpenConfirmActionModal.mock.calls[0]![3]
    const first = confirm()
    const second = confirm()
    await flushPromises()

    expect(mockUnassignRegistration).toHaveBeenCalledOnce()
    expect(wrapper.find<HTMLButtonElement>('[data-testid="action-button-unassign"]').element.disabled).toBe(true)
    request.resolve()
    await Promise.all([first, second])
    await flushPromises()
    expect(wrapper.find<HTMLButtonElement>('[data-testid="action-button-unassign"]').element.disabled).toBe(false)
    wrapper.unmount()
  })

  it('shows mutation errors, retains notice text and restores controls for recovery', async () => {
    decisionIntent.value = RegistrationActionsE.SEND_NOC
    decisionEmailContent.value.content = 'Notice to retain'
    mockSendNotice.mockRejectedValueOnce(new Error('notice failed'))
    const escapedError = vi.fn()
    const wrapper = await mountSuspended(ActionButtons, {
      global: { plugins: [enI18n], config: { errorHandler: escapedError } }
    })

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockOpenErrorModal).toHaveBeenCalledOnce()
    expect(escapedError).not.toHaveBeenCalled()
    expect(mockRefreshNuxtData).not.toHaveBeenCalled()
    expect(decisionEmailContent.value.content).toBe('Notice to retain')
    expect(wrapper.find<HTMLButtonElement>('[data-testid="main-action-button"]').element.disabled).toBe(false)
    wrapper.unmount()
  })

  it('restores controls without submitting or reloading when email validation fails', async () => {
    decisionIntent.value = RegistrationActionsE.CANCEL
    mockIsDecisionEmailValid.mockResolvedValueOnce(false)
    const wrapper = await mount()

    await clickMainButton(wrapper)
    await flushPromises()

    expect(mockUpdateRegistrationStatus).not.toHaveBeenCalled()
    expect(mockRefreshNuxtData).not.toHaveBeenCalled()
    expect(mockOpenErrorModal).not.toHaveBeenCalled()
    expect(wrapper.find<HTMLButtonElement>('[data-testid="main-action-button"]').element.disabled).toBe(false)
    wrapper.unmount()
  })
})
