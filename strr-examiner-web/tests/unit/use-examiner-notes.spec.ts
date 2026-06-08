import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// Capture the confirmHandler the modal receives so tests can invoke it directly.
let capturedConfirmHandler: (() => Promise<void>) | null = null

const mockOpenConfirmActionModal = vi.fn(
  (_title: string, _content: string, _confirmBtn: string, confirmHandler: () => Promise<void>) => {
    capturedConfirmHandler = confirmHandler
  }
)
const mockClose = vi.fn()
const mockTranslation = vi.fn((key: string) => key)

mockNuxtImport('useStrrModals', () => () => ({
  openConfirmActionModal: mockOpenConfirmActionModal,
  close: mockClose
}))

mockNuxtImport('useNuxtApp', () => () => ({
  $i18n: { t: mockTranslation }
}))

describe('useExaminerNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedConfirmHandler = null
    // Reset the module-level singleton between tests.
    const { noteContent } = useExaminerNotes()
    noteContent.value = ''
  })

  describe('hasUnsavedNote', () => {
    it('is false when noteContent is empty', () => {
      const { hasUnsavedNote } = useExaminerNotes()
      expect(hasUnsavedNote.value).toBe(false)
    })

    it('is false when noteContent is only whitespace', () => {
      const { noteContent, hasUnsavedNote } = useExaminerNotes()
      noteContent.value = '   '
      expect(hasUnsavedNote.value).toBe(false)
    })

    it('is true when noteContent has non-whitespace characters', () => {
      const { noteContent, hasUnsavedNote } = useExaminerNotes()
      noteContent.value = 'some draft'
      expect(hasUnsavedNote.value).toBe(true)
    })
  })

  describe('noteContent singleton', () => {
    it('is shared across multiple calls to useExaminerNotes()', () => {
      const a = useExaminerNotes()
      const b = useExaminerNotes()

      a.noteContent.value = 'written by a'
      expect(b.noteContent.value).toBe('written by a')
    })
  })

  describe('withNoteCheck', () => {
    it('calls the action immediately when there is no unsaved note', () => {
      const { withNoteCheck } = useExaminerNotes()
      const action = vi.fn()

      withNoteCheck(action)

      expect(action).toHaveBeenCalledOnce()
      expect(mockOpenConfirmActionModal).not.toHaveBeenCalled()
    })

    it('opens the Discard Note modal instead of calling the action when a note has content', () => {
      const { noteContent, withNoteCheck } = useExaminerNotes()
      noteContent.value = 'unfinished thought'
      const action = vi.fn()

      withNoteCheck(action)

      expect(mockOpenConfirmActionModal).toHaveBeenCalledOnce()
      expect(action).not.toHaveBeenCalled()
    })

    it('passes the correct i18n keys to the modal', () => {
      const { noteContent, withNoteCheck } = useExaminerNotes()
      noteContent.value = 'draft'

      withNoteCheck(vi.fn())

      const [title, content, confirmBtn, , cancelBtn] = mockOpenConfirmActionModal.mock.calls[0]!
      expect(title).toBe('modal.discardNote.title')
      expect(content).toBe('modal.discardNote.message')
      expect(confirmBtn).toBe('modal.discardNote.confirmBtn')
      expect(cancelBtn).toBe('modal.discardNote.keepEditing')
    })

    it('clears noteContent, closes the modal, and calls the action when confirm is invoked', async () => {
      const { noteContent, withNoteCheck } = useExaminerNotes()
      noteContent.value = 'draft'
      const action = vi.fn()

      withNoteCheck(action)
      expect(capturedConfirmHandler).not.toBeNull()
      if (capturedConfirmHandler === null) {
        throw new Error('confirm handler was not captured')
      }
      await capturedConfirmHandler()

      expect(noteContent.value).toBe('')
      expect(mockClose).toHaveBeenCalledOnce()
      expect(action).toHaveBeenCalledOnce()
    })

    it('does not call the action before the user confirms the modal', () => {
      const { noteContent, withNoteCheck } = useExaminerNotes()
      noteContent.value = 'draft'
      const action = vi.fn()

      withNoteCheck(action)

      // confirmHandler has been captured but not yet invoked
      expect(action).not.toHaveBeenCalled()
    })
  })
})
