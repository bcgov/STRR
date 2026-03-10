import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { baseEnI18n } from '../mocks/i18n'

// capture the last modal.open() call so tests can inspect component and props directly
let modal: { component: unknown, props: any } | null = null

const mockModalOpen = vi.fn((component, props) => {
  modal = { component, props }
})
const mockModalClose = vi.fn()

mockNuxtImport('useModal', () => () => ({
  open: mockModalOpen,
  close: mockModalClose
}))

const $t = baseEnI18n.global.t

const mockReqReset = vi.fn()
const mockPropReset = vi.fn()
const mockResetApiDocs = vi.fn()

vi.mock('@/stores/propertyRequirements', () => ({
  usePropertyReqStore: vi.fn(() => ({ $reset: mockReqReset }))
}))

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: vi.fn(() => ({ $reset: mockPropReset }))
}))

vi.mock('@/stores/document', () => ({
  useDocumentStore: vi.fn(() => ({ resetApiDocs: mockResetApiDocs }))
}))

describe('useHostPmModals composable', () => {
  beforeEach(() => {
    // reset state for each test
    vi.clearAllMocks()
    modal = null
    mockResetApiDocs.mockResolvedValue(undefined)
  })

  it('should open ModalBase with create account title', () => {
    const { openHelpCreateAccountModal } = useHostPmModals()
    openHelpCreateAccountModal()
    expect(mockModalOpen).toHaveBeenCalled()
    expect(modal?.props).toMatchObject({
      title: $t('modal.createAccount.title'),
      content: $t('modal.createAccount.content')
    })
  })

  it('should include a close action', () => {
    const { openHelpCreateAccountModal } = useHostPmModals()
    openHelpCreateAccountModal()
    expect(modal?.props.actions).toHaveLength(1)
    expect(modal?.props.actions[0].label).toBe($t('btn.closeBtn'))
  })

  it('should use edit title and content when edit=true (default)', () => {
    const { openConfirmRestartApplicationModal } = useHostPmModals()
    openConfirmRestartApplicationModal()
    expect(modal?.props.title).toBe($t('modal.editUnitAddress.title'))
  })

  it('should use remove title and content when edit=false', () => {
    const { openConfirmRestartApplicationModal } = useHostPmModals()
    openConfirmRestartApplicationModal(false)
    expect(modal?.props.title).toBe($t('modal.removeUnitAddress.title'))
  })

  it('should reset stores and close modal when confirm action is triggered', async () => {
    const { openConfirmRestartApplicationModal } = useHostPmModals()
    openConfirmRestartApplicationModal()
    const confirmAction = modal?.props.actions
      .find((a: any) => a.label === $t('modal.editUnitAddress.confirmBtn'))
    await confirmAction.handler()
    expect(mockReqReset).toHaveBeenCalled()
    expect(mockPropReset).toHaveBeenCalled()
    expect(mockResetApiDocs).toHaveBeenCalled()
    expect(mockModalClose).toHaveBeenCalled()
  })

  it('should open PlatformRegNumHelp with a close action', () => {
    const { openStrataRegNumberHelpModal } = useHostPmModals()
    openStrataRegNumberHelpModal()
    expect(mockModalOpen).toHaveBeenCalled()
    expect(modal?.props.actions[0].label).toBe($t('modal.strataPlatformNumHelp.closeBtn'))
  })

  it('should return a Promise and open a modal with title', () => {
    const { openConfirmUnsavedChanges } = useHostPmModals()
    const result = openConfirmUnsavedChanges()
    expect(result).toBeInstanceOf(Promise)
    expect(mockModalOpen).toHaveBeenCalled()
    expect(modal?.props.title).toBe($t('modal.unsavedChanges.title'))
  })

  it('should resolve true when confirm button is clicked', async () => {
    const { openConfirmUnsavedChanges } = useHostPmModals()
    const promise = openConfirmUnsavedChanges()
    const confirmBtn = modal?.props.actions.find((a: any) => a.label === $t('modal.unsavedChanges.confirmBtn'))
    confirmBtn.handler()
    await expect(promise).resolves.toBe(true)
  })

  it('should resolve false when close button is clicked', async () => {
    const { openConfirmUnsavedChanges } = useHostPmModals()
    const promise = openConfirmUnsavedChanges()
    const closeBtn = modal?.props.actions.find((a: any) => a.label === $t('modal.unsavedChanges.closeBtn'))
    closeBtn.handler()
    await expect(promise).resolves.toBe(false)
  })

  it('should open SupportingDocumentsHelp with a close action', () => {
    const { openSupportingDocumentsHelpModal } = useHostPmModals()
    openSupportingDocumentsHelpModal()
    expect(mockModalOpen).toHaveBeenCalled()
    expect(modal?.props.actions[0].label).toBe($t('btn.closeBtn'))
  })

  it('should call modal close', () => {
    useHostPmModals().close()
    expect(mockModalClose).toHaveBeenCalled()
  })
})
