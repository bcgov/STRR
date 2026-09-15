import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { mockHostApplication, mockHostRegistration } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import ApplicationDetails from '~/pages/examine/[applicationId].vue'
import RegistrationDetails from '~/pages/registration/[registrationId]/index.vue'

const mockGetDetails = vi.fn()
const mockSendNotice = vi.fn()
const mockUpdateRouteAndButtons = vi.fn()
const mockOpenErrorModal = vi.fn()
const emailContent = ref({ content: 'Synthetic notice' })
let actionPromise: Promise<void> | undefined
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined

mockNuxtImport('useExaminerStore', () => () => ({
  getApplicationById: mockGetDetails,
  getNextApplication: mockGetDetails,
  getRegistrationById: mockGetDetails,
  sendNoticeOfConsideration: mockSendNotice,
  sendNoticeOfConsiderationForRegistration: mockSendNotice,
  assignApplication: vi.fn(),
  isAssignedToUser: ref(true),
  isHostApplication: ref(true),
  isApplication: ref(true),
  activeHeader: ref({ ...mockHostApplication.header, assignee: { username: 'synthetic-examiner' } }),
  activeRecord: ref(mockHostRegistration),
  emailFormRef: ref({}),
  emailContent
}))

mockNuxtImport('useExaminerRoute', () => () => ({
  updateRouteAndButtons: mockUpdateRouteAndButtons
}))
mockNuxtImport('useLocalePath', () => () => (path: string) => path)
mockNuxtImport('useRoute', () => () => ({
  params: { applicationId: '1234567890', registrationId: '42' }
}))

mockNuxtImport('useExaminerNotes', () => () => ({
  useNoteLeaveGuard: vi.fn(),
  withNoteCheck: (action: () => Promise<void>) => { actionPromise = action() }
}))

mockNuxtImport('useExaminerDecision', () => () => ({ showDecisionPanel: ref(false) }))
mockNuxtImport('useExaminerFeatureFlags', () => () => ({
  isExaminerNotesEnabled: ref(false),
  isHistoricalApplicationsTableEnabled: ref(false),
  isSnapshotVersionsTableEnabled: ref(false)
}))
mockNuxtImport('useStrrModals', () => () => ({
  openConfirmActionModal: vi.fn(),
  close: vi.fn(),
  openErrorModal: mockOpenErrorModal
}))
mockNuxtImport('validateForm', () => vi.fn().mockResolvedValue(undefined))
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: { t: (key: string) => key }
}))

describe.each([
  {
    name: 'application',
    page: ApplicationDetails,
    id: '1234567890',
    noticeKey: 'sendNotice',
    record: mockHostApplication
  },
  {
    name: 'registration',
    page: RegistrationDetails,
    id: 42,
    noticeKey: 'registrationSendNotice',
    record: mockHostRegistration
  }
])('$name notice refresh', ({ page, id, noticeKey, record }) => {
  beforeEach(async () => {
    vi.clearAllMocks()
    clearNuxtData(['application-details-view', 'registration-details-view'])
    emailContent.value.content = 'Synthetic notice'
    actionPromise = undefined
    mockGetDetails.mockReset().mockResolvedValue(record)
    mockSendNotice.mockReset().mockResolvedValue(undefined)
    useButtonControl().setButtonControl({
      leftButtons: [{ label: 'Back', action: vi.fn(), loading: false, disabled: false }],
      rightButtons: [{ label: 'Send notice', action: vi.fn(), loading: false, disabled: false }]
    })
    wrapper = await mountSuspended(page, {
      global: {
        plugins: [enI18n],
        stubs: {
          ConnectSpinner: true,
          ExaminerErrorState: true,
          ApplicationDetailsView: true,
          DocumentUpload: true,
          ComposeNoc: true,
          DecisionPanel: true,
          AssignmentActions: true
        }
      }
    })
    await flushPromises()
    expect(mockGetDetails).toHaveBeenCalledOnce()
    expect(mockUpdateRouteAndButtons).toHaveBeenCalled()
  })

  afterEach(() => {
    wrapper?.unmount()
    clearNuxtData(['application-details-view', 'registration-details-view'])
  })

  it('awaits the notice and its reload, clearing content only after sending succeeds', async () => {
    const mutation = Promise.withResolvers<void>()
    const reload = Promise.withResolvers<typeof record>()
    mockSendNotice.mockReturnValueOnce(mutation.promise)
    mockGetDetails.mockReturnValueOnce(reload.promise)
    const config = mockUpdateRouteAndButtons.mock.calls.at(-1)![1]
    config[noticeKey].action(id)
    await flushPromises()

    expect(mockSendNotice).toHaveBeenCalledWith(id, 'Synthetic notice')
    expect(mockGetDetails).toHaveBeenCalledOnce()
    expect(emailContent.value.content).toBe('Synthetic notice')
    expect(useButtonControl().getButtonControl()?.rightButtons[0]?.loading).toBe(true)

    mutation.resolve()
    await flushPromises()
    const settled = vi.fn()
    expect(actionPromise).toBeDefined()
    actionPromise!.then(settled)
    await flushPromises()
    expect(mockGetDetails).toHaveBeenCalledTimes(2)
    expect(emailContent.value.content).toBe('')
    expect(settled).not.toHaveBeenCalled()
    expect(useButtonControl().getButtonControl()?.rightButtons[0]?.loading).toBe(true)

    reload.resolve({ ...record })
    await actionPromise
    expect(useButtonControl().getButtonControl()?.rightButtons[0]).toMatchObject({ loading: false, disabled: false })
    expect(mockOpenErrorModal).not.toHaveBeenCalled()
  })

  it('retains the notice and skips reload when sending fails', async () => {
    mockSendNotice.mockRejectedValueOnce(new Error('notice rejected'))
    const config = mockUpdateRouteAndButtons.mock.calls.at(-1)![1]
    config[noticeKey].action(id)
    await flushPromises()
    await actionPromise

    expect(mockSendNotice).toHaveBeenCalledOnce()
    expect(mockGetDetails).toHaveBeenCalledOnce()
    expect(emailContent.value.content).toBe('Synthetic notice')
    expect(mockOpenErrorModal).toHaveBeenCalledOnce()
    expect(useButtonControl().getButtonControl()?.rightButtons[0]?.loading).toBe(false)
  })

  it('shows a reload error without reporting a successful notice as failed', async () => {
    const reload = Promise.withResolvers<typeof record>()
    mockGetDetails.mockReturnValueOnce(reload.promise)
    const config = mockUpdateRouteAndButtons.mock.calls.at(-1)![1]
    config[noticeKey].action(id)
    await flushPromises()

    expect(mockSendNotice).toHaveBeenCalledOnce()
    expect(emailContent.value.content).toBe('')
    expect(useButtonControl().getButtonControl()?.rightButtons[0]?.loading).toBe(true)
    reload.reject(new Error('detail reload failed'))
    await actionPromise
    await flushPromises()

    expect(wrapper!.findComponent({ name: 'ExaminerErrorState' }).exists()).toBe(true)
    expect(mockOpenErrorModal).not.toHaveBeenCalled()
    expect(mockSendNotice).toHaveBeenCalledOnce()
    expect(useButtonControl().getButtonControl()).toEqual({ leftButtons: [], rightButtons: [] })
  })
})
