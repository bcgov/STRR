import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { mockHostApplicationWithoutReviewer, mockHostApplicationWithReviewer } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import { ConfirmationModal, AssignmentActions } from '#components'

const mockAssignApplication = vi.fn().mockResolvedValue(undefined)
const mockUnassignApplication = vi.fn().mockResolvedValue(undefined)
const mockUpdateRouteAndButtons = vi.fn()

const showConfirmModal = ref(false)
const modalTitle = ref('')
const modalMessage = ref('')
const confirmButtonText = ref('')
const cancelButtonText = ref('')
let confirmCallback = vi.fn()

const activeHeader = ref(mockHostApplicationWithReviewer.header)
const isAssignedToUser = ref(true)

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    assignApplication: mockAssignApplication,
    unassignApplication: mockUnassignApplication,
    isAssignedToUser,
    activeHeader
  }),
  storeToRefs: () => ({
    activeHeader,
    isAssignedToUser
  })
}))

vi.mock('@/composables/useExaminerRoute', () => ({
  useExaminerRoute: () => ({
    updateRouteAndButtons: mockUpdateRouteAndButtons
  })
}))

vi.mock('@/composables/useConfirmationModal', () => ({
  useConfirmationModal: () => ({
    showConfirmModal,
    modalTitle,
    modalMessage,
    confirmButtonText,
    cancelButtonText,
    openConfirmModal: ({ title, message, confirmText, onConfirm }) => {
      showConfirmModal.value = true
      modalTitle.value = title
      modalMessage.value = message
      confirmButtonText.value = confirmText
      confirmCallback = onConfirm
    },
    closeConfirmModal: () => {
      showConfirmModal.value = false
    },
    handleConfirm: () => {
      confirmCallback()
    }
  })
}))

vi.mock('@/enums/routes', () => ({
  RoutesE: {
    EXAMINE: 'examine'
  }
}))

describe('AssignmentActions Component', () => {
  let wrapper:any

  beforeEach(async () => {
    vi.clearAllMocks()
    activeHeader.value = mockHostApplicationWithReviewer.header
    wrapper = await mountSuspended(AssignmentActions, {
      global: {
        plugins: [enI18n]
      }
    })
    await flushPromises()
  })

  it('renders the component with confirmation modal', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(ConfirmationModal).exists()).toBe(true)
  })

  it('calls updateRouteAndButtons on component mount', () => {
    expect(mockUpdateRouteAndButtons).toHaveBeenCalled()
    const args = mockUpdateRouteAndButtons.mock.calls[0]
    expect(args[0]).toBe('examine')
    expect(args[1]).toHaveProperty('assign')
    expect(args[1]).toHaveProperty('unassign')
    expect(args[2]).toBe(true)
  })

  it('calls updateRouteAndButtons when activeHeader changes', async () => {
    mockUpdateRouteAndButtons.mockClear()
    activeHeader.value = mockHostApplicationWithoutReviewer.header
    await flushPromises()
    expect(mockUpdateRouteAndButtons).toHaveBeenCalled()
  })

  const getButtonActions = () => {
    const calls = mockUpdateRouteAndButtons.mock.calls
    const latestCall = calls[calls.length - 1]
    return latestCall ? latestCall[1] : null
  }

  it('calls assignApplication when assign action is triggered', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const assignAction = buttonConfig.assign.action
    await assignAction('12345678901234')
    expect(mockAssignApplication).toHaveBeenCalledWith('12345678901234')
  })

  it('calls unassignApplication directly when current user is the assignee', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const unassignAction = buttonConfig.unassign.action
    await unassignAction('12345678901234')
    expect(mockUnassignApplication).toHaveBeenCalledWith('12345678901234')
  })

  it('opens confirmation modal when current user is not the assignee', async () => {
    isAssignedToUser.value = false
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const unassignAction = buttonConfig.unassign.action
    await unassignAction('12345678901234')
    expect(mockUnassignApplication).not.toHaveBeenCalled()
    expect(showConfirmModal.value).toBe(true)
    expect(modalTitle.value).toBeTruthy()
    expect(modalMessage.value).toBeTruthy()
  })

  it('calls unassignApplication when confirmation modal is confirmed', async () => {
    isAssignedToUser.value = false
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const unassignAction = buttonConfig.unassign.action
    await unassignAction('12345678901234')
    expect(showConfirmModal.value).toBe(true)
    confirmCallback()
    await flushPromises()
    expect(mockUnassignApplication).toHaveBeenCalledWith('12345678901234')
  })

  it('emits refresh event after successful assignment', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const assignAction = buttonConfig.assign.action
    await assignAction('12345678901234')
    expect(wrapper.emitted()).toHaveProperty('refresh')
  })

  it('emits refresh event after successful unassignment', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const unassignAction = buttonConfig.unassign.action
    isAssignedToUser.value = true
    await unassignAction('12345678901234')
    expect(wrapper.emitted()).toHaveProperty('refresh')
  })
})
